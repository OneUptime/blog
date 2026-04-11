# How to Use Redis Pipelining in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Pipelining, ioredis, Performance

Description: Learn how to use Redis pipelining in Node.js with ioredis to batch commands, reduce network round trips, and improve throughput for bulk operations.

---

## What Is Redis Pipelining?

Pipelining sends multiple Redis commands in a single network request, receiving all responses together. This eliminates individual round-trip latency for each command.

Without pipelining: each command waits for a response before the next is sent.
With pipelining: all commands are sent together, responses come back in order.

## Basic Pipeline with ioredis

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function basicPipeline() {
  const pipeline = redis.pipeline();

  // Queue commands
  pipeline.set('key1', 'value1');
  pipeline.set('key2', 'value2');
  pipeline.set('key3', 'value3');
  pipeline.get('key1');
  pipeline.get('key2');

  // Execute all at once
  const results = await pipeline.exec();
  // results is an array of [error, result] pairs
  results.forEach(([err, result], i) => {
    if (err) {
      console.error(`Command ${i} failed:`, err);
    } else {
      console.log(`Command ${i} result:`, result);
    }
  });
}

basicPipeline();
```

## Performance Comparison

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function withoutPipeline(count = 1000) {
  const start = Date.now();
  for (let i = 0; i < count; i++) {
    await redis.set(`key:${i}`, `value:${i}`);
  }
  return Date.now() - start;
}

async function withPipeline(count = 1000) {
  const start = Date.now();
  const pipeline = redis.pipeline();
  for (let i = 0; i < count; i++) {
    pipeline.set(`key:${i}`, `value:${i}`);
  }
  await pipeline.exec();
  return Date.now() - start;
}

async function compare() {
  const withoutMs = await withoutPipeline(500);
  const withMs = await withPipeline(500);
  console.log(`Without pipeline: ${withoutMs}ms`);
  console.log(`With pipeline: ${withMs}ms`);
  console.log(`Speedup: ${(withoutMs / withMs).toFixed(1)}x`);
}

compare();
```

## Handling Individual Command Errors

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function pipelineWithErrorHandling() {
  await redis.set('string_key', 'hello');

  const pipeline = redis.pipeline();
  pipeline.set('new_key', 'value');
  pipeline.lpush('string_key', 'item'); // This will fail (wrong type)
  pipeline.incr('counter');

  const results = await pipeline.exec();

  results.forEach(([err, result], index) => {
    if (err) {
      console.error(`Command ${index} error: ${err.message}`);
    } else {
      console.log(`Command ${index} OK: ${result}`);
    }
  });
}

pipelineWithErrorHandling();
```

## Chaining Pipeline Commands

ioredis supports chaining for more concise syntax:

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function chainedPipeline() {
  const results = await redis
    .pipeline()
    .set('user:1:name', 'Alice')
    .set('user:1:email', 'alice@example.com')
    .hset('user:1:profile', 'age', '30', 'role', 'admin')
    .incr('user:count')
    .expire('session:abc', 3600)
    .exec();

  console.log('Results:', results);
}

chainedPipeline();
```

## Bulk Data Loading

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function bulkLoad(data, chunkSize = 500) {
  const entries = Object.entries(data);
  let totalProcessed = 0;

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const pipeline = redis.pipeline();

    for (const [key, value] of chunk) {
      pipeline.set(key, JSON.stringify(value));
    }

    await pipeline.exec();
    totalProcessed += chunk.length;
    console.log(`Processed ${totalProcessed}/${entries.length}`);
  }
}

// Generate test data
const data = {};
for (let i = 0; i < 10000; i++) {
  data[`item:${i}`] = { id: i, name: `Item ${i}`, value: Math.random() };
}

bulkLoad(data);
```

## Reading Multiple Keys in Bulk

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function bulkGet(keys) {
  const pipeline = redis.pipeline();
  keys.forEach(key => pipeline.get(key));
  const results = await pipeline.exec();

  return keys.reduce((acc, key, i) => {
    const [err, value] = results[i];
    if (!err && value !== null) {
      acc[key] = JSON.parse(value);
    }
    return acc;
  }, {});
}

async function main() {
  const keys = Array.from({ length: 100 }, (_, i) => `item:${i}`);
  const values = await bulkGet(keys);
  console.log(`Retrieved ${Object.keys(values).length} items`);
}

main();
```

## Pipeline with TTL

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function cacheMany(items, ttl = 3600) {
  const pipeline = redis.pipeline();

  items.forEach(({ key, value }) => {
    pipeline.setex(key, ttl, JSON.stringify(value));
  });

  await pipeline.exec();
  console.log(`Cached ${items.length} items with TTL ${ttl}s`);
}

const items = [
  { key: 'product:1', value: { name: 'Widget', price: 9.99 } },
  { key: 'product:2', value: { name: 'Gadget', price: 29.99 } },
  { key: 'product:3', value: { name: 'Doohickey', price: 4.99 } },
];

cacheMany(items);
```

## Using Pipeline in Express.js

```javascript
const express = require('express');
const Redis = require('ioredis');

const app = express();
const redis = new Redis();

app.get('/users/batch', async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean);

  if (ids.length === 0) {
    return res.json([]);
  }

  const pipeline = redis.pipeline();
  ids.forEach(id => pipeline.hgetall(`user:${id}`));

  const results = await pipeline.exec();
  const users = results
    .map(([err, data], i) => err ? null : { id: ids[i], ...data })
    .filter(Boolean);

  res.json(users);
});
```

## Summary

Redis pipelining in Node.js with ioredis dramatically reduces latency for bulk operations by batching commands into a single network request. Use `redis.pipeline()` to queue commands and `exec()` to send them all at once, processing `[error, result]` pairs from the response array. For very large datasets, process in chunks of 500-1000 commands to balance memory usage and throughput. Pipelining is non-atomic - use `multi()` for atomic transactions.
