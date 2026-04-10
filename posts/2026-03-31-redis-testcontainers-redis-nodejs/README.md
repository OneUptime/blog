# How to Use Testcontainers with Redis in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Testcontainers, Integration Testing, Jest

Description: Learn how to use Testcontainers to spin up a real Redis instance for Node.js integration tests, ensuring reliable test isolation with no manual setup.

---

Testcontainers for Node.js spins up Docker containers during tests and tears them down automatically. Using it with Redis means your integration tests run against a real Redis instance - no mocks, no shared state between test runs.

## Prerequisites

- Docker installed and running
- Node.js 18+

## Installation

```bash
npm install --save-dev testcontainers @testcontainers/redis
npm install redis
```

## Basic Setup with Jest

```javascript
// redis.integration.test.js
import { RedisContainer } from '@testcontainers/redis';
import { createClient } from 'redis';

let container;
let client;

beforeAll(async () => {
  container = await new RedisContainer().start();

  client = createClient({ url: container.getConnectionUrl() });
  client.on('error', console.error);
  await client.connect();
}, 30000); // 30s timeout for container startup

afterAll(async () => {
  await client.close();
  await container.stop();
});

beforeEach(async () => {
  await client.flushDb(); // Clean state between tests
});

it('stores and retrieves a value', async () => {
  await client.set('greeting', 'hello');
  const val = await client.get('greeting');
  expect(val).toBe('hello');
});

it('key expires after TTL', async () => {
  await client.setEx('token', 1, 'abc123');
  await new Promise((r) => setTimeout(r, 1100));
  const val = await client.get('token');
  expect(val).toBeNull();
});
```

## Using a Specific Redis Version

```javascript
import { RedisContainer } from '@testcontainers/redis';

const container = await new RedisContainer('redis:7.2-alpine').start();
```

## Using Redis Stack (for RediSearch, RedisJSON)

```javascript
import { GenericContainer } from 'testcontainers';

const container = await new GenericContainer('redis/redis-stack-server:latest')
  .withExposedPorts(6379)
  .start();

const port = container.getMappedPort(6379);
const host = container.getHost();

const client = createClient({ url: `redis://${host}:${port}` });
await client.connect();
```

## Shared Container Across Tests (Jest globalSetup)

For faster test suites, start the container once:

```javascript
// jest.globalSetup.js
import { RedisContainer } from '@testcontainers/redis';

export default async function globalSetup() {
  const container = await new RedisContainer().start();
  process.env.REDIS_TEST_URL = container.getConnectionUrl();
  global.__REDIS_CONTAINER__ = container;
}
```

```javascript
// jest.globalTeardown.js
export default async function globalTeardown() {
  await global.__REDIS_CONTAINER__?.stop();
}
```

```javascript
// jest.config.js
export default {
  globalSetup: './jest.globalSetup.js',
  globalTeardown: './jest.globalTeardown.js',
};
```

## Testing a Service That Uses Redis

```javascript
// userCache.js
export function createUserCache(redis) {
  return {
    async getUser(id) {
      const data = await redis.get(`user:${id}`);
      return data ? JSON.parse(data) : null;
    },
    async setUser(id, user) {
      await redis.setEx(`user:${id}`, 3600, JSON.stringify(user));
    },
  };
}
```

```javascript
it('caches a user object', async () => {
  const { createUserCache } = await import('./userCache');
  const cache = createUserCache(client);

  await cache.setUser('1', { name: 'Alice', email: 'alice@example.com' });
  const result = await cache.getUser('1');

  expect(result.name).toBe('Alice');
});
```

## Summary

Testcontainers for Node.js makes integration testing with Redis straightforward: spin up a real Redis container before tests, run commands against it, and tear it down afterward. Using `flushDb()` between tests ensures isolation, and a shared container via `globalSetup` keeps the suite fast. This approach catches bugs that mocks would miss - like serialization issues, TTL behavior, and transaction semantics.
