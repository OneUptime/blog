# How to Choose Between node-redis and ioredis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, node-redis, ioredis, Comparison

Description: Compare node-redis and ioredis to decide which Redis client is the best fit for your Node.js project based on features, performance, and ecosystem.

---

Two Redis clients dominate the Node.js ecosystem: `node-redis` (the official client) and `ioredis` (a community favorite). Both are mature and actively maintained, but they have different strengths.

## Quick Comparison

| Feature | node-redis | ioredis |
| --- | --- | --- |
| Maintained by | Redis Ltd | Luin / community |
| API style | Promise-based | Promise-based + callbacks |
| Cluster support | Yes | Yes (better ergonomics) |
| Sentinel support | Yes | Yes |
| Lua scripting | Yes | Yes (defineCommand) |
| Auto-pipelining | Yes | Yes |
| Streams | Yes | Yes |
| TypeScript types | Built-in | Built-in |
| Browser bundle | No | No |

## node-redis

node-redis v4+ was rewritten to be fully promise-based with first-class TypeScript support.

```javascript
import { createClient } from 'redis';

const client = createClient({ url: 'redis://localhost:6379' });
client.on('error', console.error);
await client.connect();

await client.set('key', 'value');
const val = await client.get('key');
```

**Best for:**
- New projects wanting the official client
- Applications using Redis 7+ features
- Teams that prefer staying on the "blessed" path

## ioredis

ioredis has a slightly different API and more built-in cluster features.

```javascript
import Redis from 'ioredis';

const redis = new Redis({ host: 'localhost', port: 6379 });

await redis.set('key', 'value');
const val = await redis.get('key');
```

**Best for:**
- Projects already using ioredis
- Applications needing robust Cluster or Sentinel with fewer config lines
- Custom Lua commands via `defineCommand`

## Cluster Comparison

**node-redis cluster:**

```javascript
import { createCluster } from 'redis';

const cluster = createCluster({
  rootNodes: [
    { url: 'redis://node1:6379' },
    { url: 'redis://node2:6379' },
    { url: 'redis://node3:6379' },
  ],
});
await cluster.connect();
```

**ioredis cluster:**

```javascript
import Redis from 'ioredis';

const cluster = new Redis.Cluster([
  { host: 'node1', port: 6379 },
  { host: 'node2', port: 6379 },
  { host: 'node3', port: 6379 },
]);
```

Both clients handle `MOVED` and `ASK` redirects automatically. ioredis exposes more cluster tuning options out of the box.

## Custom Commands

**ioredis defineCommand:**

```javascript
redis.defineCommand('setIfGreater', {
  numberOfKeys: 1,
  lua: `
    local current = redis.call('GET', KEYS[1])
    if not current or tonumber(ARGV[1]) > tonumber(current) then
      return redis.call('SET', KEYS[1], ARGV[1])
    end
    return 0
  `,
});
await redis.setIfGreater('score', 100);
```

node-redis supports custom Lua scripts via `defineScript`, which is passed through the `scripts` option in `createClient`. For ad-hoc commands, use `client.sendCommand()`.

## Decision Guide

```text
Use node-redis if:
  - Starting a new project
  - You want the officially supported client
  - Your team values long-term Redis Inc. maintenance

Use ioredis if:
  - You are migrating an existing ioredis codebase
  - You need fine-grained Redis Cluster configuration
  - You use defineCommand heavily for Lua scripts
```

## Summary

Both clients are production-ready and well-supported. For new projects, node-redis is the safe default as the officially maintained client with built-in TypeScript support. ioredis remains a strong choice for teams already invested in it or those needing advanced cluster configuration. The APIs are similar enough that migrating between them is straightforward if your needs change.
