# How to Implement State Partitioning for High Throughput in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Partitioning, Throughput, Scalability

Description: Learn how to implement state partitioning in Dapr to distribute hot keys across multiple state store shards and increase write throughput for high-traffic workloads.

---

## Why Partition State?

A single Redis instance or state store shard can become a bottleneck under high write volumes. Partitioning distributes keys across multiple shards, turning one bottleneck into many parallel paths. Dapr's multiple component instances make this straightforward.

## Multiple State Store Components as Shards

Define several state store components pointing to different Redis instances:

```yaml
# shard 0
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: state-shard-0
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-0.redis:6379"
---
# shard 1
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: state-shard-1
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-1.redis:6379"
---
# shard 2
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: state-shard-2
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-2.redis:6379"
```

## Hash-Based Shard Router

Implement a hash function to route keys to shards:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();
const crypto = require('crypto');

const SHARD_COUNT = 3;
const SHARDS = ['state-shard-0', 'state-shard-1', 'state-shard-2'];

function getShardForKey(key) {
  const hash = crypto.createHash('md5').update(key).digest('hex');
  const index = parseInt(hash.slice(0, 8), 16) % SHARD_COUNT;
  return SHARDS[index];
}

async function saveToShard(key, value) {
  const shard = getShardForKey(key);
  await client.state.save(shard, [{ key, value }]);
}

async function getFromShard(key) {
  const shard = getShardForKey(key);
  return client.state.get(shard, key);
}
```

## Partitioning by User ID Range

For user-specific data, partition by user ID range:

```javascript
function getShardForUser(userId) {
  const numericId = parseInt(userId.replace(/\D/g, ''), 10) || 0;
  return SHARDS[numericId % SHARD_COUNT];
}

async function saveUserProfile(userId, profile) {
  const shard = getShardForUser(userId);
  await client.state.save(shard, [
    { key: `user:${userId}:profile`, value: profile }
  ]);
}
```

## Fan-Out Reads Across All Shards

Some queries need to read from all shards:

```javascript
async function getAllActiveUsers() {
  const results = await Promise.all(
    SHARDS.map(shard => client.state.getBulk(shard, ['active-users-index']))
  );
  // Merge results from all shards — getBulk returns an array of {key, data} objects
  return results.flatMap(r => {
    const item = r.find(i => i.key === 'active-users-index');
    return item?.data || [];
  });
}
```

## Benchmarking Shard Throughput

```bash
# Load test with a single shard
wrk -t4 -c100 -d30s -s write-state.lua http://localhost:3500

# Add shards and compare throughput
# Expect near-linear scaling up to network saturation
```

## Resharding Considerations

When adding new shards with modulo hashing, most keys will remap (changing from N to N+1 shards moves roughly N/(N+1) of all keys). Use a migration script that reads each key from every existing shard, hashes it against the new shard count, and writes it to the correct new shard before deleting from the old one. For minimal key movement during resharding, consider using a consistent hashing algorithm (hash ring) instead of simple modulo.

## Summary

Dapr state partitioning using multiple component instances with hash-based routing distributes hot-key load across independent state store shards. The routing logic is a thin layer in your application and can be extracted into a shared library for reuse across services.
