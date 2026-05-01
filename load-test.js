import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.1'],
  },
};

export default function () {
  const tests = [
    { name: 'all properties', url: 'http://localhost:3000/properties' },
    { name: 'filtered by price', url: 'http://localhost:3000/properties?minPrice=100000&maxPrice=500000' },
    { name: 'filtered by city', url: 'http://localhost:3000/properties?city=Houston' },
    { name: 'filtered by bedrooms', url: 'http://localhost:3000/properties?minBedrooms=3' },
    { name: 'paginated', url: 'http://localhost:3000/properties?limit=20' },
    { name: 'OR operator', url: 'http://localhost:3000/properties?city=Austin&minPrice=200000&operator=OR' },
    { name: 'combined filters', url: 'http://localhost:3000/properties?city=Dallas&minBedrooms=2&minPrice=150000&maxPrice=800000' },
  ];

  const test = tests[Math.floor(Math.random() * tests.length)];
  const res = http.get(test.url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => {
      const body = JSON.parse(r.body);
      return body.data !== undefined;
    },
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(res.status !== 200);
  sleep(0.5);
}
