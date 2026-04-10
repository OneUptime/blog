# Redis Batch Operation Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipeline, Batch Operation, Performance, Throughput, Best Practice

Description: Learn how to use Redis pipelines, MGET/MSET, and transactions to batch operations efficiently, reducing round trips and maximizing throughput.

---

## Why Batching Matters

Every Redis command sent from a client incurs a round-trip latency cost - typically 0.1 to 1ms depending on network distance. Running 1,000 individual commands means 1,000 round trips, which is 100-1000ms of latency overhead alone.

Batching groups multiple commands together, sending them in one or a few network round trips.

## Individual vs. Batched: The Difference

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// SLOW: 1000 round trips
async function setKeysSlowly(data) {
  for (const [key, value] of Object.entries(data)) {
    await redis.set(key, value); // Each awaited = 1 round trip
  }
}

// FAST: 1 round trip
async function setKeysFast(data) {
  const pipeline = redis.pipeline();
  for (const [key, value] of Object.entries(data)) {
    pipeline.set(key, value);
  }
  await pipeline.exec(); // All commands sent in one batch
}
```

## Using Pipelines

Pipelines batch commands without atomicity guarantees. Commands are queued client-side and sent together:

```javascript
async function batchUpdate(userId, profileData) {
  const pipeline = redis.pipeline();

  pipeline.hset(`user:${userId}`, profileData);
  pipeline.expire(`user:${userId}`, 3600);
  pipeline.zadd('active-users', Date.now(), userId);
  pipeline.incr('metrics:profile-updates');

  const results = await pipeline.exec();
  // results is an array of [error, result] pairs
  results.forEach(([err, result], i) => {
    if (err) console.error(`Command ${i} failed:`, err);
  });
}
```

## Using MGET and MSET

For simple key-value operations, MGET and MSET are more efficient than pipelines:

```bash
# Set multiple keys in one command
MSET user:1:name "Alice" user:2:name "Bob" user:3:name "Carol"

# Get multiple keys in one command
MGET user:1:name user:2:name user:3:name
```

```javascript
// MGET example in Node.js
async function getUserNames(userIds) {
  const keys = userIds.map(id => `user:${id}:name`);
  const names = await redis.mget(...keys);
  return userIds.map((id, i) => ({ id, name: names[i] }));
}

// MSET example
async function bulkSetUserNames(users) {
  const args = users.flatMap(u => [`user:${u.id}:name`, u.name]);
  await redis.mset(...args);
}
```

## Python Pipeline Example

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def batch_set_scores(scores: dict):
    """Batch update leaderboard scores."""
    pipe = r.pipeline()

    for user_id, score in scores.items():
        pipe.zadd('leaderboard:global', {user_id: score})
        pipe.set(f'user:{user_id}:last-score', score, ex=3600)

    results = pipe.execute()
    return results

# Usage
scores = {'user:1': 9500, 'user:2': 8800, 'user:3': 9100}
batch_set_scores(scores)
```

## Transactions with MULTI/EXEC

Use MULTI/EXEC when you need atomicity - all commands execute together or not at all:

```javascript
async function transferPoints(fromUser, toUser, points) {
  const multi = redis.multi();
  multi.decrby(`user:${fromUser}:points`, points);
  multi.incrby(`user:${toUser}:points`, points);
  multi.rpush('transactions:log', JSON.stringify({ fromUser, toUser, points, ts: Date.now() }));

  const results = await multi.exec();
  if (!results) throw new Error('Transaction was aborted');
  return results;
}
```

## Optimistic Locking with WATCH

Use WATCH for check-and-set patterns:

```javascript
async function conditionalUpdate(key, expectedValue, newValue) {
  await redis.watch(key);

  const current = await redis.get(key);
  if (current !== expectedValue) {
    await redis.unwatch();
    return false; // Value changed, skip update
  }

  const multi = redis.multi();
  multi.set(key, newValue);
  const result = await multi.exec();

  return result !== null; // null means WATCH failed (key changed)
}
```

## Batching Hash Operations with HGETALL

```javascript
async function batchGetUserProfiles(userIds) {
  const pipeline = redis.pipeline();
  userIds.forEach(id => pipeline.hgetall(`user:${id}`));

  const results = await pipeline.exec();
  return results.map(([err, data], i) => ({
    userId: userIds[i],
    profile: err ? null : data
  }));
}
```

## Chunking Large Batches

For very large datasets, chunk operations to avoid blocking Redis too long:

```javascript
async function batchSetWithChunking(keyValuePairs, chunkSize = 500) {
  const chunks = [];
  for (let i = 0; i < keyValuePairs.length; i += chunkSize) {
    chunks.push(keyValuePairs.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const pipeline = redis.pipeline();
    chunk.forEach(([key, value]) => pipeline.set(key, value));
    await pipeline.exec();
    // Optional: small delay between chunks to avoid I/O spikes
  }
}
```

## Performance Benchmarks

```text
Operation           N=1000 keys    Latency (local Redis)
---------           -----------    ---------------------
Individual SET      1000           ~200ms (1000 round trips)
Pipeline SET        1000           ~5ms (1 round trip)
MSET                1000           ~3ms (1 round trip)
MULTI/EXEC SET      1000           ~5ms (atomic, 1 round trip)
```

## Summary

Redis batch operations reduce round-trip latency dramatically. Use pipelines for non-atomic bulk operations, MGET/MSET for simple key-value batches, and MULTI/EXEC for atomic operations. Chunk very large batches to prevent blocking Redis and to control memory usage on the client. A well-implemented pipeline can be 10-100x faster than individual commands for bulk workloads.
