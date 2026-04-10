# What Does 'WRONGTYPE Operation' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, WRONGTYPE, Data Type, Debugging

Description: Understand what the Redis WRONGTYPE error means, why it occurs when using commands on the wrong data type, and how to fix it in your application.

---

## What Is the WRONGTYPE Error

When you run a Redis command against a key that holds a different data type than the command expects, Redis returns:

```text
(error) WRONGTYPE Operation against a key holding the wrong kind of value
```

This is a type safety mechanism in Redis. Each Redis data structure - string, list, hash, set, sorted set, stream - has its own set of commands. You cannot use list commands on a hash key, or hash commands on a string key.

## Common Causes

### Using the Wrong Command on an Existing Key

```bash
# Create a string key
redis-cli SET user:100 "alice"

# Try to use LPUSH (list command) on it
redis-cli LPUSH user:100 "item"
# (error) WRONGTYPE Operation against a key holding the wrong kind of value
```

```bash
# Create a list
redis-cli RPUSH queue:jobs "job1" "job2"

# Try to use HGET (hash command) on it
redis-cli HGET queue:jobs field1
# (error) WRONGTYPE Operation against a key holding the wrong kind of value
```

### Colliding Key Names Across Data Types

A common cause is reusing key names for different data types in the same Redis namespace. For example, if one part of your code stores `user:100` as a string and another part attempts to treat it as a hash:

```python
# Code path A stores a JSON string
redis_client.set("user:100", json.dumps({"name": "alice"}))

# Code path B tries to treat user:100 as a hash
redis_client.hset("user:100", "name", "alice")
# Raises ResponseError: WRONGTYPE Operation against a key holding the wrong kind of value
```

## How to Diagnose the Error

### Check the Key Type

```bash
redis-cli TYPE user:100
# string
```

The TYPE command returns: `string`, `list`, `set`, `zset`, `hash`, or `stream`.

### Inspect the Key Value

```bash
# For strings
redis-cli GET user:100

# For lists
redis-cli LRANGE queue:jobs 0 -1

# For hashes
redis-cli HGETALL user:profile:100
```

## How to Fix the Error

### Option 1 - Delete the Key and Re-create with the Correct Type

If the key has stale or incorrect data:

```bash
redis-cli DEL user:100
redis-cli HSET user:100 name "alice" email "alice@example.com"
```

### Option 2 - Use Different Key Names per Data Type

Establish a naming convention that encodes the type:

```bash
# Strings for simple values
user:100:name

# Hashes for structured data
user:100:profile

# Lists for queues
queue:jobs:pending
```

### Option 3 - Check Type Before Operating in Code

```python
import redis

r = redis.Redis()

def safe_lpush(key, value):
    key_type = r.type(key)
    if key_type == b'none':
        r.lpush(key, value)
    elif key_type == b'list':
        r.lpush(key, value)
    else:
        raise ValueError(f"Key {key} is type {key_type}, expected list")
```

### Option 4 - Use MULTI/EXEC with TYPE Check

In transactions, guard operations with a type check:

```bash
WATCH user:100
TYPE user:100
# If type is correct, proceed with MULTI
MULTI
HSET user:100 name "alice"
EXEC
```

## Handling in Application Code

### Python (redis-py)

```python
import redis

r = redis.Redis()

try:
    r.hset("user:100", "name", "alice")
except redis.exceptions.ResponseError as e:
    if "WRONGTYPE" in str(e):
        # Key exists with wrong type - handle accordingly
        key_type = r.type("user:100").decode()
        print(f"Key has type: {key_type}")
        # Option: delete and recreate, or use a different key
```

### Node.js (ioredis)

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function safeHset(key, field, value) {
  try {
    await redis.hset(key, field, value);
  } catch (err) {
    if (err.message.includes('WRONGTYPE')) {
      const keyType = await redis.type(key);
      console.error(`Key ${key} is of type ${keyType}, cannot use as hash`);
      throw err;
    }
    throw err;
  }
}
```

## Prevention

- Establish key naming conventions that make the data type obvious
- Document which keys use which Redis types in your codebase
- Use a type-safe Redis abstraction layer that enforces types per key
- Add integration tests that validate Redis key types are as expected

## Summary

The WRONGTYPE error occurs when you use a Redis command on a key that holds a different data type than the command expects. Fix it by checking the key type with the TYPE command, deleting and re-creating the key with the correct type, or using a key naming convention that avoids type collisions. In application code, catch ResponseError and inspect the message to handle WRONGTYPE errors gracefully.
