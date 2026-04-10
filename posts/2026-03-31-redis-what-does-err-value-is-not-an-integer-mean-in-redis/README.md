# What Does 'ERR value is not an integer' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, Integer, INCR, INCRBY, Data Type, Troubleshooting

Description: Learn why Redis returns 'ERR value is not an integer or out of range' on INCR and INCRBY commands, and how to validate integer values and handle type errors.

---

## What Is the "ERR value is not an integer" Error

When you run an integer arithmetic command on a key that does not hold a valid integer string, or pass a non-integer argument to a command that expects one, Redis returns:

```text
(error) ERR value is not an integer or out of range
```

This error occurs with commands like `INCR`, `INCRBY`, `DECRBY`, `SETRANGE`, `GETRANGE`, `EXPIRE`, `EXPIREAT`, and others that require integer values.

## Commands That Produce This Error

```bash
# INCR on a non-integer string
redis-cli SET counter "hello"
redis-cli INCR counter
# (error) ERR value is not an integer or out of range

# INCRBY with a float value
redis-cli SET counter 1
redis-cli INCRBY counter 1.5
# (error) ERR value is not an integer or out of range

# EXPIRE with a non-integer
redis-cli SET mykey "data"
redis-cli EXPIRE mykey 3.14
# (error) ERR value is not an integer or out of range

# LRANGE with non-integer index
redis-cli RPUSH mylist "a" "b" "c"
redis-cli LRANGE mylist "start" "end"
# (error) ERR value is not an integer or out of range
```

## What Redis Considers a Valid Integer

Redis accepts:
- Decimal integers: `1`, `-5`, `100`, `0`
- String representations of integers: `"42"`, `"-10"`, `"0"`

Redis does NOT accept for integer commands:
- Floats: `1.5`, `3.14`
- Non-numeric strings: `"abc"`, `"one"`
- Large numbers exceeding 64-bit signed integer range (`-9223372036854775808` to `9223372036854775807`)

## Common Causes

### Key Holds a String Value

```python
import redis

r = redis.Redis()

# Setting a non-integer value
r.set('page_views', 'many')

# Trying to increment it
r.incr('page_views')
# ResponseError: ERR value is not an integer or out of range
```

### Passing a Float When Integer Is Required

```python
# Wrong - INCRBY requires an integer
r.incrby('counter', 1.5)  # Error

# Right - use INCRBYFLOAT for float increments
r.incrbyfloat('counter', 1.5)  # OK
```

### Expired TTL Calculation Using a Float

```python
import time

# Wrong - EXPIRE requires integer seconds
r.expire('session:123', time.time() + 3600)  # time.time() returns float
# Error

# Right - convert to int
r.expire('session:123', int(time.time() + 3600 - time.time()))  # Still wrong
r.expire('session:123', 3600)  # Correct - pass duration as integer
```

### Encoding Issues

```python
# Reading a value from somewhere and accidentally including whitespace
value = "  42  "  # Spaces around the number
r.set('mykey', value)
r.incr('mykey')  # Error - Redis does not trim spaces
```

## How to Fix

### Ensure Integer Values Are Set Correctly

```python
import redis

r = redis.Redis()

# Set an integer counter properly
r.set('page_views', 0)
r.set('page_views', str(0))  # Equivalent

# Increment safely
count = r.incr('page_views')
count = r.incrby('page_views', 5)
```

### Validate Before Sending

```python
def safe_incrby(r, key, amount):
    if not isinstance(amount, int):
        try:
            amount = int(amount)
        except (TypeError, ValueError):
            raise ValueError(f"Amount must be an integer, got: {amount}")
    return r.incrby(key, amount)

def safe_expire(r, key, seconds):
    if not isinstance(seconds, int):
        raise TypeError(f"seconds must be an integer, got {type(seconds)}")
    if seconds <= 0:
        raise ValueError("seconds must be positive")
    return r.expire(key, seconds)
```

### Reset a Non-Integer Key

If a key has an incorrect value and needs to be used as a counter:

```python
import redis

r = redis.Redis()

def reset_counter(key, initial=0):
    current = r.get(key)
    if current is not None:
        try:
            int(current)
            return  # Already valid
        except ValueError:
            pass
    r.set(key, initial)

reset_counter('page_views')
r.incr('page_views')  # Now works
```

### Handle INCR on Missing Keys

`INCR` and `INCRBY` on keys that do not exist treat the key as having value `0` - this is fine and does not cause an error:

```bash
redis-cli DEL counter
redis-cli INCR counter
# (integer) 1  <- Starts from 0, no error
```

## Using the Right Command for the Right Type

| Use Case | Correct Command |
|----------|-----------------|
| Increment by 1 | `INCR` |
| Increment by integer N | `INCRBY key N` |
| Increment by float | `INCRBYFLOAT key 1.5` |
| Decrement by 1 | `DECR` |
| Decrement by integer N | `DECRBY key N` |
| Set TTL in seconds | `EXPIRE key 3600` |
| Set TTL as Unix timestamp | `EXPIREAT key 1743417600` |
| Set TTL in milliseconds | `PEXPIRE key 3600000` |

## Node.js Example

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function safeIncrBy(key, amount) {
  const intAmount = parseInt(amount, 10);
  if (isNaN(intAmount) || intAmount !== parseFloat(amount)) {
    throw new Error(`Amount must be an integer, got: ${amount}`);
  }
  return redis.incrby(key, intAmount);
}

async function safeExpire(key, seconds) {
  const intSeconds = Math.floor(seconds);
  if (intSeconds <= 0) {
    throw new Error('Expiry must be a positive integer');
  }
  return redis.expire(key, intSeconds);
}
```

## Summary

The "ERR value is not an integer or out of range" error means a Redis command received a non-integer value where an integer was required. Fix it by ensuring integer counters are initialized as numeric strings, using `INCRBYFLOAT` instead of `INCRBY` for decimal increments, converting float TTL values to integers before calling `EXPIRE`, and validating inputs in helper functions before passing them to Redis.
