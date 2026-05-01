const DEFAULT_TIMEOUT_MS = 10_000;

export class CacheLock {
  private readonly locks = new Map<string, Promise<unknown>>();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const pending = this.locks.get(key);

    if (pending) {
      return pending as Promise<T>;
    }

    const promise = this.withTimeout(fn, key);
    this.locks.set(key, promise);

    try {
      return await promise;
    } finally {
      this.locks.delete(key);
    }
  }

  private async withTimeout<T>(fn: () => Promise<T>, key: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Lock timeout: ${key}`)),
        DEFAULT_TIMEOUT_MS,
      ),
    );

    return Promise.race([fn(), timeout]);
  }
}
