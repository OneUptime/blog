# How to Mock Redis in Node.js Unit Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Testing, Mock, Jest

Description: Learn how to mock Redis in Node.js unit tests using ioredis-mock and jest, keeping tests fast and isolated without a real Redis instance.

---

Unit tests should run fast and without external dependencies. Mocking Redis lets you test your application logic in isolation while simulating realistic Redis behavior. This guide covers mocking with `ioredis-mock` and manual mocking with Jest.

## Option 1: ioredis-mock

`ioredis-mock` is an in-memory drop-in replacement for ioredis.

```bash
npm install --save-dev ioredis-mock ioredis
```

### Usage in Tests

```javascript
// cache.js - your app module
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getUser(id) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  return null;
}

export async function setUser(id, user) {
  await redis.setex(`user:${id}`, 300, JSON.stringify(user));
}
```

```javascript
// cache.test.js
import * as cache from './cache';

jest.mock('ioredis', () => require('ioredis-mock'));

describe('user cache', () => {
  it('returns null when user is not cached', async () => {
    const result = await cache.getUser('123');
    expect(result).toBeNull();
  });

  it('returns cached user', async () => {
    const user = { id: '123', name: 'Alice' };
    await cache.setUser('123', user);
    const result = await cache.getUser('123');
    expect(result).toEqual(user);
  });
});
```

## Option 2: Manual Jest Mock

For node-redis, create a manual mock:

```javascript
// __mocks__/redis.js
const store = new Map();

const client = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
  set: jest.fn((key, value) => { store.set(key, value); return Promise.resolve('OK'); }),
  setEx: jest.fn((key, ttl, value) => { store.set(key, value); return Promise.resolve('OK'); }),
  del: jest.fn((key) => { store.delete(key); return Promise.resolve(1); }),
  incr: jest.fn((key) => {
    const val = parseInt(store.get(key) || '0') + 1;
    store.set(key, String(val));
    return Promise.resolve(val);
  }),
  on: jest.fn().mockReturnThis(),
};

export const createClient = jest.fn(() => client);

// Helper to reset store between tests
export const __resetStore = () => store.clear();
```

```javascript
// service.test.js
import { __resetStore } from 'redis';

jest.mock('redis');

beforeEach(() => __resetStore());

it('increments page view counter', async () => {
  const { incrementViews, getViews } = await import('./analytics');
  await incrementViews('homepage');
  await incrementViews('homepage');
  const views = await getViews('homepage');
  expect(views).toBe(2);
});
```

## Option 3: Dependency Injection

The cleanest approach - inject Redis as a parameter:

```javascript
// cache.js
export function createCache(redis) {
  return {
    async get(key) {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    },
    async set(key, value, ttl = 300) {
      await redis.setEx(key, ttl, JSON.stringify(value));
    },
  };
}
```

```javascript
// cache.test.js
import { createCache } from './cache';

const mockRedis = {
  get: jest.fn(),
  setEx: jest.fn(),
};

const cache = createCache(mockRedis);

it('returns null for missing key', async () => {
  mockRedis.get.mockResolvedValue(null);
  expect(await cache.get('missing')).toBeNull();
});
```

## Summary

Mocking Redis in Node.js unit tests can be done three ways: using `ioredis-mock` as a drop-in replacement, creating a manual Jest mock that simulates in-memory storage, or designing your code with dependency injection so Redis is easily swappable. The dependency injection approach is the most flexible and keeps tests cleanest by avoiding module-level mocks entirely.
