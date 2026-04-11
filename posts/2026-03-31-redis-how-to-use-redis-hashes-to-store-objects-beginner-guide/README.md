# How to Use Redis Hashes to Store Objects (Beginner Guide)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hash, Data Structure, Object, Beginner, HSET

Description: Learn how to store and retrieve structured objects in Redis using hashes, including field operations, partial updates, and memory efficiency.

---

## What Is a Redis Hash

A Redis hash is a map of field-value pairs stored under a single key, similar to a dictionary in Python or an object in JavaScript. Hashes are the natural way to store structured records like user profiles, product details, or configuration objects in Redis.

Instead of serializing an entire object to JSON:

```bash
# Inefficient: entire object as a string
SET user:42 '{"name":"Alice","email":"alice@example.com","age":30}'
```

Use a hash to store each field separately:

```bash
HSET user:42 name "Alice" email "alice@example.com" age 30
```

## Basic Hash Commands

```bash
# HSET: Set one or more fields
HSET user:42 name "Alice" email "alice@example.com" age 30 role "admin"

# HGET: Get a single field
HGET user:42 name
# "Alice"

# HMGET: Get multiple fields at once
HMGET user:42 name email role
# 1) "Alice"
# 2) "alice@example.com"
# 3) "admin"

# HGETALL: Get all fields and values
HGETALL user:42
# 1) "name"
# 2) "Alice"
# 3) "email"
# 4) "alice@example.com"
# 5) "age"
# 6) "30"
# 7) "role"
# 8) "admin"

# HEXISTS: Check if a field exists
HEXISTS user:42 email
# (integer) 1

# HDEL: Delete a field
HDEL user:42 role

# HLEN: Count number of fields
HLEN user:42
# 3
```

## Updating Fields Without Fetching the Whole Object

One key advantage of hashes is partial updates - you can change one field without reading or rewriting the rest:

```bash
# Update only the age field
HSET user:42 age 31

# Increment a numeric field atomically
HINCRBY user:42 login_count 1

# Increment a float field
HINCRBYFLOAT product:101 price 5.50
```

## Working with Hashes in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Store a user object
def save_user(user_id, user_data):
    r.hset(f'user:{user_id}', mapping=user_data)
    r.expire(f'user:{user_id}', 86400)  # 24-hour TTL

# Retrieve full user
def get_user(user_id):
    return r.hgetall(f'user:{user_id}')

# Get only specific fields
def get_user_name_and_email(user_id):
    name, email = r.hmget(f'user:{user_id}', 'name', 'email')
    return {'name': name, 'email': email}

# Partial update
def update_user_email(user_id, new_email):
    r.hset(f'user:{user_id}', 'email', new_email)

# Increment a counter field
def increment_login_count(user_id):
    return r.hincrby(f'user:{user_id}', 'login_count', 1)

# Usage
save_user(42, {
    'name': 'Alice',
    'email': 'alice@example.com',
    'age': '30',
    'role': 'admin',
    'login_count': '0'
})

user = get_user(42)
print(user)
# {'name': 'Alice', 'email': 'alice@example.com', ...}

increment_login_count(42)
# login_count is now 1
```

## Working with Hashes in Node.js

```javascript
const redis = require('redis');
const client = redis.createClient();
await client.connect();

async function saveProduct(productId, data) {
  await client.hSet(`product:${productId}`, data);
  await client.expire(`product:${productId}`, 3600);
}

async function getProduct(productId) {
  return client.hGetAll(`product:${productId}`);
}

async function updatePrice(productId, newPrice) {
  await client.hSet(`product:${productId}`, 'price', newPrice.toString());
}

// Usage
await saveProduct(101, {
  name: 'Widget',
  price: '9.99',
  stock: '100',
  category: 'tools'
});

const product = await getProduct(101);
console.log(product.name); // 'Widget'
```

## Storing Nested Data

Redis hashes only support string values - no nested objects. For nested data, flatten the structure or serialize sub-objects:

```python
# Flat structure for simple nesting
r.hset('user:42', mapping={
    'name': 'Alice',
    'address_street': '123 Main St',
    'address_city': 'Springfield',
    'address_zip': '62701'
})

# Or serialize nested parts as JSON strings
import json
r.hset('user:42', mapping={
    'name': 'Alice',
    'address': json.dumps({'street': '123 Main St', 'city': 'Springfield'}),
    'preferences': json.dumps({'theme': 'dark', 'language': 'en'})
})
```

## Scanning Hash Fields

For hashes with many fields, use HSCAN instead of HGETALL to avoid blocking:

```bash
# Scan hash fields in batches
HSCAN user:42 0 COUNT 10
```

```python
def scan_hash_fields(key):
    cursor = 0
    while True:
        cursor, fields = r.hscan(key, cursor, count=100)
        for field, value in fields.items():
            print(f'{field}: {value}')
        if cursor == 0:
            break
```

## When to Use Hashes vs. Strings

| Scenario | Use |
|---|---|
| Store a full object, retrieve all fields | Hash (HGETALL) |
| Update one field without reading others | Hash (HSET) |
| Atomic numeric increments | Hash (HINCRBY) |
| Simple string or JSON blob | String (SET/GET) |
| Store a list of items | List |

## Summary

Redis hashes map cleanly to application objects, allowing partial field updates without deserializing the whole record. Commands like `HSET`, `HGET`, and `HINCRBY` handle the most common object operations atomically. For records with many fields accessed partially, hashes are significantly more memory-efficient than storing serialized JSON strings, and they eliminate the need to deserialize the entire object just to update one field.
