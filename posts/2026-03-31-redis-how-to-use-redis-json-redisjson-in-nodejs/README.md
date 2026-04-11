# How to Use Redis JSON (RedisJSON) in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, RedisJSON, JSON, ioredis

Description: Learn how to use RedisJSON in Node.js with ioredis to store, query, and update JSON documents natively in Redis with JSONPath operations.

---

## What Is RedisJSON?

RedisJSON is a Redis module that allows storing, retrieving, and manipulating JSON documents directly in Redis. Advantages over storing serialized strings:

- Query and update specific paths within a document
- Avoid full serialize/deserialize cycles for partial updates
- JSONPath expressions for nested access
- Atomic operations on JSON fields

## Setup

```bash
# Run Redis Stack with RedisJSON
docker run -p 6379:6379 redis/redis-stack:latest

npm install ioredis
```

## Storing and Retrieving JSON

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function basicJsonOps() {
  // Store a JSON document
  await redis.call('JSON.SET', 'user:1001', '$', JSON.stringify({
    id: 1001,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    age: 30,
    address: {
      city: 'New York',
      country: 'US'
    },
    tags: ['admin', 'user'],
    score: 95.5
  }));

  // Get the entire document
  const raw = await redis.call('JSON.GET', 'user:1001', '$');
  const user = JSON.parse(raw)[0];
  console.log(user);

  // Get a specific field with JSONPath
  const name = await redis.call('JSON.GET', 'user:1001', '$.name');
  console.log(JSON.parse(name)); // ['Alice Johnson']

  // Get nested field
  const city = await redis.call('JSON.GET', 'user:1001', '$.address.city');
  console.log(JSON.parse(city)); // ['New York']
}

basicJsonOps();
```

## Using the JSON Commands Directly

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Helper class for cleaner JSON operations
class JsonRedis {
  async set(key, path, value) {
    return redis.call('JSON.SET', key, path, JSON.stringify(value));
  }

  async get(key, path = '$') {
    const result = await redis.call('JSON.GET', key, path);
    if (!result) return null;
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
  }

  async del(key, path = '$') {
    return redis.call('JSON.DEL', key, path);
  }

  async type(key, path = '$') {
    return redis.call('JSON.TYPE', key, path);
  }

  async numIncrBy(key, path, value) {
    const result = await redis.call('JSON.NUMINCRBY', key, path, value);
    return JSON.parse(result)[0];
  }

  async arrAppend(key, path, ...values) {
    return redis.call('JSON.ARRAPPEND', key, path, ...values.map(v => JSON.stringify(v)));
  }

  async arrLen(key, path) {
    const result = await redis.call('JSON.ARRLEN', key, path);
    return result[0];
  }
}

const jredis = new JsonRedis();

// Store product
await jredis.set('product:42', '$', {
  id: 42,
  name: 'Wireless Headphones',
  price: 79.99,
  inventory: 100,
  tags: ['electronics', 'audio'],
  specs: { color: 'black', weight: '250g' }
});

// Read full document
const product = await jredis.get('product:42');
console.log('Product:', product);

// Update nested field
await jredis.set('product:42', '$.specs.color', 'white');

// Increment numeric field
const newInventory = await jredis.numIncrBy('product:42', '$.inventory', -5);
console.log('Remaining inventory:', newInventory); // 95

// Append to array
await jredis.arrAppend('product:42', '$.tags', 'sale');
const tagCount = await jredis.arrLen('product:42', '$.tags');
console.log('Tag count:', tagCount); // 3

// Delete a field
await jredis.del('product:42', '$.specs.weight');
```

## Advanced JSONPath Operations

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function advancedOperations() {
  // Store a complex document
  await redis.call('JSON.SET', 'store:1', '$', JSON.stringify({
    name: 'Tech Store',
    products: [
      { id: 1, name: 'Laptop', price: 999, inStock: true },
      { id: 2, name: 'Mouse', price: 29, inStock: true },
      { id: 3, name: 'Keyboard', price: 79, inStock: false }
    ]
  }));

  // Get all product names
  const names = await redis.call('JSON.GET', 'store:1', '$.products[*].name');
  console.log('Products:', JSON.parse(names));
  // ['Laptop', 'Mouse', 'Keyboard']

  // Get in-stock products' prices
  const prices = await redis.call('JSON.GET', 'store:1', '$.products[?(@.inStock==true)].price');
  console.log('In-stock prices:', JSON.parse(prices)); // [999, 29]

  // Increase first product's price by 100
  await redis.call('JSON.NUMINCRBY', 'store:1', '$.products[0].price', 100);

  // Get count of products array
  const count = await redis.call('JSON.ARRLEN', 'store:1', '$.products');
  console.log('Product count:', count[0]); // 3
}

advancedOperations();
```

## Pipelining JSON Commands

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function bulkJsonStore(documents) {
  const pipeline = redis.pipeline();

  for (const doc of documents) {
    pipeline.call('JSON.SET', `doc:${doc.id}`, '$', JSON.stringify(doc));
  }

  const results = await pipeline.exec();
  const failures = results.filter(([err]) => err !== null);
  console.log(`Stored ${documents.length - failures.length} docs, ${failures.length} failed`);
}

const docs = [
  { id: 1, title: 'Redis Basics', tags: ['redis', 'tutorial'] },
  { id: 2, title: 'Node.js Tips', tags: ['nodejs', 'javascript'] },
  { id: 3, title: 'JSON in Redis', tags: ['redis', 'json'] },
];

await bulkJsonStore(docs);
```

## Setting TTL on JSON Keys

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function storeWithTTL(key, document, ttlSeconds) {
  const pipe = redis.pipeline();
  pipe.call('JSON.SET', key, '$', JSON.stringify(document));
  pipe.expire(key, ttlSeconds);
  await pipe.exec();
  console.log(`Stored ${key} with ${ttlSeconds}s TTL`);
}

await storeWithTTL('session:data:abc123', {
  userId: 1001,
  permissions: ['read', 'write'],
  preferences: { theme: 'dark', lang: 'en' }
}, 3600);
```

## Summary

RedisJSON in Node.js via ioredis raw `call()` commands enables native JSON storage with JSONPath for partial reads and writes. Create a wrapper class around `JSON.SET`, `JSON.GET`, `JSON.DEL`, `JSON.NUMINCRBY`, and `JSON.ARRAPPEND` for a cleaner API. Pipeline multiple JSON operations for bulk ingestion, and combine with `expire` for TTL-managed JSON documents. RedisJSON eliminates the need to serialize/deserialize full documents for partial field updates.
