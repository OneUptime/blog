# How to Use Redis Hashes in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Hash, ioredis, Data Structure

Description: Learn how to use Redis Hashes in Node.js with ioredis for storing objects, partial updates, field scanning, and practical user profile management.

---

## What Are Redis Hashes?

Redis Hashes store field-value pairs under a single key, making them ideal for representing objects. Advantages over storing JSON strings:

- Update individual fields without rewriting the entire object
- Read specific fields without fetching the full object
- Lower memory usage for structured data
- Atomic field-level operations (increment, etc.)

## Basic Hash Operations

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function basicHashOps() {
  // Set multiple fields at once
  await redis.hset('user:1001',
    'name', 'Alice Johnson',
    'email', 'alice@example.com',
    'age', '30',
    'role', 'admin'
  );

  // Get a single field
  const name = await redis.hget('user:1001', 'name');
  console.log(name); // Alice Johnson

  // Get multiple specific fields
  const [email, role] = await redis.hmget('user:1001', 'email', 'role');
  console.log(email, role); // alice@example.com admin

  // Get all fields and values
  const user = await redis.hgetall('user:1001');
  console.log(user);
  // { name: 'Alice Johnson', email: 'alice@example.com', age: '30', role: 'admin' }

  // Get all field names
  const fields = await redis.hkeys('user:1001');
  console.log(fields); // ['name', 'email', 'age', 'role']

  // Get all values
  const values = await redis.hvals('user:1001');
  console.log(values);

  // Count fields
  const count = await redis.hlen('user:1001');
  console.log(count); // 4
}

basicHashOps();
```

## Updating and Deleting Fields

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function updateAndDelete() {
  // Update a single field
  await redis.hset('user:1001', 'age', '31');

  // Conditionally set field only if it doesn't exist
  const result = await redis.hsetnx('user:1001', 'created_at', Date.now().toString());
  console.log(result); // 1 (set) or 0 (already exists)

  // Increment a numeric field
  await redis.hset('user:1001', 'login_count', '0');
  const newCount = await redis.hincrby('user:1001', 'login_count', 1);
  console.log(newCount); // 1

  // Increment a float field
  await redis.hset('user:1001', 'score', '9.5');
  const newScore = await redis.hincrbyfloat('user:1001', 'score', 0.5);
  console.log(newScore); // 10

  // Delete specific fields
  const deleted = await redis.hdel('user:1001', 'age', 'role');
  console.log(deleted); // 2 (number of fields deleted)

  // Check if field exists
  const exists = await redis.hexists('user:1001', 'email');
  console.log(exists); // 1
}

updateAndDelete();
```

## Storing User Profiles

```javascript
const Redis = require('ioredis');
const redis = new Redis();

class UserRepository {
  constructor(ttl = 3600) {
    this.ttl = ttl;
  }

  key(userId) {
    return `user:${userId}`;
  }

  async create(userId, profile) {
    await redis.hset(this.key(userId), {
      ...profile,
      id: userId.toString(),
      created_at: Date.now().toString(),
      updated_at: Date.now().toString()
    });
    if (this.ttl) {
      await redis.expire(this.key(userId), this.ttl);
    }
    return this.get(userId);
  }

  async get(userId) {
    const data = await redis.hgetall(this.key(userId));
    return Object.keys(data).length > 0 ? data : null;
  }

  async getFields(userId, ...fields) {
    const values = await redis.hmget(this.key(userId), ...fields);
    return fields.reduce((acc, field, i) => {
      acc[field] = values[i];
      return acc;
    }, {});
  }

  async update(userId, updates) {
    const key = this.key(userId);
    await redis.hset(key, {
      ...updates,
      updated_at: Date.now().toString()
    });
    if (this.ttl) {
      await redis.expire(key, this.ttl);
    }
  }

  async delete(userId) {
    return redis.del(this.key(userId));
  }

  async incrementField(userId, field, by = 1) {
    return redis.hincrby(this.key(userId), field, by);
  }
}

const userRepo = new UserRepository();

(async () => {
  const user = await userRepo.create('1001', {
    name: 'Alice',
    email: 'alice@example.com',
    plan: 'pro'
  });
  console.log('Created:', user);

  await userRepo.update('1001', { plan: 'enterprise' });
  await userRepo.incrementField('1001', 'login_count');

  const profile = await userRepo.getFields('1001', 'name', 'email', 'plan');
  console.log('Profile:', profile);
})();
```

## Bulk Hash Operations with Pipeline

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function bulkCreateUsers(users) {
  const pipeline = redis.pipeline();

  for (const user of users) {
    pipeline.hset(`user:${user.id}`, {
      name: user.name,
      email: user.email,
      created_at: Date.now().toString()
    });
    pipeline.expire(`user:${user.id}`, 86400);
  }

  await pipeline.exec();
  console.log(`Created ${users.length} users`);
}

const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Carol', email: 'carol@example.com' },
];

bulkCreateUsers(users);
```

## Scanning Hash Fields

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function scanHashFields(key, pattern = '*') {
  const fields = [];
  let cursor = '0';

  do {
    const [nextCursor, results] = await redis.hscan(key, cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;

    // results is alternating [field, value, field, value, ...]
    for (let i = 0; i < results.length; i += 2) {
      fields.push({ field: results[i], value: results[i + 1] });
    }
  } while (cursor !== '0');

  return fields;
}

scanHashFields('product:1001:metadata', 'tag_*').then((metadata) => {
  console.log('Tags:', metadata);
});
```

## Summary

Redis Hashes in Node.js with ioredis provide efficient object storage with field-level read and write access. Use `hset` for setting fields, `hget`/`hgetall`/`hmget` for retrieval, `hincrby` for atomic numeric updates, and `hdel` for field removal. Hashes are more memory-efficient than storing JSON strings when you need partial updates, and pipelining bulk hash operations dramatically improves performance for large-scale data loading.
