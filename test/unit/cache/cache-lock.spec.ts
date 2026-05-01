import { CacheLock } from '../../../src/cache/cache-lock';

describe('CacheLock', () => {
  let lock: CacheLock;

  beforeEach(() => {
    lock = new CacheLock();
  });

  it('should execute function when no existing lock', async () => {
    const fn = jest.fn().mockResolvedValue('result');
    const result = await lock.acquire('key', fn);

    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should deduplicate concurrent requests for same key', async () => {
    const fn = jest.fn().mockResolvedValue('result');

    const [first, second] = await Promise.all([
      lock.acquire('key', fn),
      lock.acquire('key', fn),
    ]);

    expect(first).toBe('result');
    expect(second).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should allow sequential requests after lock is released', async () => {
    const fn = jest.fn().mockResolvedValue('result');

    await lock.acquire('key', fn);
    await lock.acquire('key', fn);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle different keys independently', async () => {
    const fnA = jest.fn().mockResolvedValue('a');
    const fnB = jest.fn().mockResolvedValue('b');

    const [resultA, resultB] = await Promise.all([
      lock.acquire('key-a', fnA),
      lock.acquire('key-b', fnB),
    ]);

    expect(resultA).toBe('a');
    expect(resultB).toBe('b');
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
  });

  it('should release lock even if function throws', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));

    await expect(lock.acquire('key', fn)).rejects.toThrow('fail');

    const fn2 = jest.fn().mockResolvedValue('ok');
    const result = await lock.acquire('key', fn2);

    expect(result).toBe('ok');
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
