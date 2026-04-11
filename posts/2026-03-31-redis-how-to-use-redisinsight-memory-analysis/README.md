# How to Use RedisInsight Memory Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisInsight, Memory Analysis, Performance, Optimization

Description: Use RedisInsight's Memory Analysis tools to identify large keys, analyze memory distribution by key pattern, and reduce Redis memory usage.

---

## Why Memory Analysis Matters

Redis is an in-memory database, so memory is your most constrained resource. Memory issues lead to:

- OOM (Out of Memory) evictions losing important data
- Increased infrastructure costs
- Performance degradation as Redis approaches memory limits

RedisInsight provides visual memory analysis tools that identify waste without requiring deep Redis expertise.

## Accessing Memory Analysis in RedisInsight

1. Connect to your Redis instance in RedisInsight
2. Navigate to **Analysis Tools** -> **Memory Analysis** in the left sidebar
3. Click **Analyze** to run a memory scan (uses SCAN internally, non-blocking)

The analysis generates a report showing:
- Total memory breakdown by key prefix
- Top keys by memory consumption
- Data type distribution
- Suggested optimizations

## Running Memory Analysis via CLI

While RedisInsight provides a GUI, you can gather similar data programmatically:

```bash
# Check total memory usage
redis-cli INFO memory

# Sample output:
# used_memory:1073741824
# used_memory_human:1024.00M
# used_memory_rss:1200000000
# mem_fragmentation_ratio:1.12
# maxmemory:2147483648
# maxmemory_human:2.00G
```

## Finding Large Keys with MEMORY USAGE

```bash
# Check memory for a specific key
redis-cli MEMORY USAGE mykey

# Check memory usage with deeper sampling (samples more list/hash entries)
redis-cli MEMORY USAGE mykey SAMPLES 100
```

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

async function findLargeKeys(pattern = '*', topN = 20, sampleRate = 10) {
  let cursor = '0';
  const keyMemory = [];
  let scanned = 0;

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;

    // Sample a fraction of keys for performance
    const sampled = keys.filter(() => Math.random() < sampleRate / 100);

    for (const key of sampled) {
      const bytes = await redis.memory('USAGE', key, 'SAMPLES', 5);
      keyMemory.push({ key, bytes: bytes ?? 0 });
    }

    scanned += keys.length;
  } while (cursor !== '0');

  // Sort by size descending
  keyMemory.sort((a, b) => b.bytes - a.bytes);

  console.log(`\nTop ${topN} largest keys (sampled from ${scanned} total):\n`);
  console.table(
    keyMemory.slice(0, topN).map(({ key, bytes }) => ({
      key,
      sizeKB: (bytes / 1024).toFixed(2),
      sizeMB: (bytes / 1024 / 1024).toFixed(4),
    }))
  );

  return keyMemory.slice(0, topN);
}

await findLargeKeys('user:*', 20, 5);
```

## Analyzing Memory by Key Namespace

```javascript
async function analyzeByNamespace(delimiter = ':') {
  let cursor = '0';
  const namespaces = {};

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', '*', 'COUNT', 200);
    cursor = newCursor;

    for (const key of keys) {
      const namespace = key.split(delimiter)[0];
      if (!namespaces[namespace]) {
        namespaces[namespace] = { count: 0, totalBytes: 0 };
      }
      namespaces[namespace].count++;

      const bytes = await redis.memory('USAGE', key, 'SAMPLES', 2);
      namespaces[namespace].totalBytes += bytes ?? 0;
    }
  } while (cursor !== '0');

  const sorted = Object.entries(namespaces)
    .sort(([, a], [, b]) => b.totalBytes - a.totalBytes);

  console.log('\nMemory by namespace:\n');
  console.table(
    sorted.map(([namespace, { count, totalBytes }]) => ({
      namespace,
      keyCount: count,
      totalMB: (totalBytes / 1024 / 1024).toFixed(2),
      avgKB: (totalBytes / count / 1024).toFixed(2),
    }))
  );
}
```

## Memory Optimization Recommendations

### 1. Use appropriate data types

```bash
# Instead of storing JSON strings, use Hashes
# String (wasteful for structured data):
SET user:1 '{"name":"Alice","age":30,"email":"alice@example.com"}'

# Hash (more memory efficient for small-medium objects):
HSET user:1 name Alice age 30 email alice@example.com
```

### 2. Configure compression thresholds

```bash
# Hashes use listpack encoding below these thresholds (more memory efficient)
CONFIG SET hash-max-listpack-entries 128
CONFIG SET hash-max-listpack-value 64

# Lists use quicklist with internal listpack nodes; this sets max entries per node
CONFIG SET list-max-listpack-size 128
```

### 3. Set TTLs on transient data

```javascript
// Scan for keys without TTL (potential memory leaks)
async function findKeysMissingTTL(pattern) {
  let cursor = '0';
  const noTTL = [];

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) { // -1 means no TTL set
        noTTL.push(key);
      }
    }
  } while (cursor !== '0');

  console.log(`Keys without TTL: ${noTTL.length}`);
  return noTTL;
}
```

## Checking Object Encoding

```bash
# Check actual encoding used for a key
redis-cli OBJECT ENCODING mykey

# Common encodings and their memory implications:
# listpack - compact, efficient (small collections)
# hashtable - full hash table (large collections)
# ziplist - deprecated, replaced by listpack in Redis 7.0
# skiplist - for large sorted sets
# quicklist - for lists
```

## Summary

RedisInsight Memory Analysis provides visual insights into memory distribution across key namespaces, identifies unexpectedly large keys, and suggests optimizations. Combine the GUI analysis with programmatic scanning using `MEMORY USAGE` to automate alerts for growing namespaces. The most impactful optimizations are usually switching large string values to Hashes, setting TTLs on transient data, and tuning listpack thresholds to keep small collections in compact encoding.
