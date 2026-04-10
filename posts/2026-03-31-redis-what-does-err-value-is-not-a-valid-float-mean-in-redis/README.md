# What Does 'ERR value is not a valid float' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, Float, INCRBYFLOAT, ZADD, Data Validation, Troubleshooting

Description: Learn why Redis returns 'ERR value is not a valid float' on commands like INCRBYFLOAT and ZADD, and how to validate and convert float values before sending them to Redis.

---

## What Is the "ERR value is not a valid float" Error

When you pass a non-numeric or improperly formatted value to a Redis command that expects a floating-point number, Redis returns:

```text
(error) ERR value is not a valid float
```

This error occurs with commands that operate on float values, such as `INCRBYFLOAT`, `HINCRBYFLOAT`, `ZADD`, `ZINCRBY`, `GEOADD`, and others.

## Commands That Produce This Error

```bash
# INCRBYFLOAT with non-numeric value
redis-cli INCRBYFLOAT mykey "abc"
# (error) ERR value is not a valid float

# INCRBYFLOAT on a non-numeric string key
redis-cli SET mykey "hello"
redis-cli INCRBYFLOAT mykey 1.5
# (error) ERR value is not a valid float

# ZADD with non-numeric score
redis-cli ZADD myzset "notanumber" "member1"
# (error) ERR value is not a valid float

# ZINCRBY with non-numeric value
redis-cli ZINCRBY myzset "abc" "member1"
# (error) ERR value is not a valid float
```

## What Redis Considers a Valid Float

Redis accepts:
- Standard decimal notation: `3.14`, `-2.5`, `0.001`
- Scientific notation: `1.5e3`, `2.3e-4`
- Special values: `inf`, `+inf`, `-inf` (for sorted set scores)
- Integer values: `1`, `-5`, `100`

Redis does NOT accept:
- Non-numeric strings: `"abc"`, `"hello"`
- Numeric strings with non-numeric content: `"3.14abc"`, `"1,000"`
- `NaN` (not-a-number)
- Empty strings
- Strings with leading or trailing whitespace: `" 3.14"`, `"3.14 "`

## Common Causes

### Passing String Data Instead of Numbers

```python
import redis

r = redis.Redis()
r.set('user:score', 'pending')  # String value

# Later, someone tries to increment it
r.incrbyfloat('user:score', 1.0)
# redis.exceptions.ResponseError: ERR value is not a valid float
```

### Locale-Specific Number Formatting

Some locales format floats with commas instead of periods:

```python
# In a German locale, str(3.14) might produce "3,14"
# This would fail
score = "3,14"  # Invalid for Redis
r.zadd('rankings', {member: float(score.replace(',', '.'))})  # Fix
```

### Serialization Issues

```python
# Accidentally converting float to string with formatting
score = f"{3.14:.2f}"  # This is fine: "3.14"
score = f"{1234.56:,}"  # This produces "1,234.56" which Redis rejects
```

## How to Fix

### Validate Before Sending

```python
import redis

r = redis.Redis()

def safe_incrbyfloat(key, amount):
    try:
        float_amount = float(amount)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid float value: {amount}")
    return r.incrbyfloat(key, float_amount)

def safe_zadd(key, mapping):
    validated = {}
    for member, score in mapping.items():
        try:
            validated[member] = float(score)
        except (TypeError, ValueError):
            raise ValueError(f"Invalid score '{score}' for member '{member}'")
    return r.zadd(key, validated)
```

### Handle the Error Gracefully

```python
import redis

r = redis.Redis()

def increment_score(key, delta):
    try:
        return r.incrbyfloat(key, delta)
    except redis.exceptions.ResponseError as e:
        if 'not a valid float' in str(e):
            # Reset to 0 and try again, or handle as appropriate
            current = r.get(key)
            print(f"Key {key} has invalid float value: {current}")
            r.set(key, '0')
            return r.incrbyfloat(key, delta)
        raise
```

### Type-Safe Redis Wrapper

```python
from typing import Union

class TypeSafeRedis:
    def __init__(self, redis_client):
        self.r = redis_client

    def incrbyfloat(self, key: str, amount: Union[int, float]) -> float:
        if not isinstance(amount, (int, float)):
            raise TypeError(f"amount must be numeric, got {type(amount)}")
        if amount != amount:  # NaN check
            raise ValueError("NaN is not a valid Redis float")
        return self.r.incrbyfloat(key, amount)

    def zadd_scored(self, key: str, scores: dict) -> int:
        validated = {}
        for member, score in scores.items():
            if not isinstance(score, (int, float)):
                raise TypeError(f"Score must be numeric for member {member}")
            validated[member] = score
        return self.r.zadd(key, validated)
```

## Node.js Example

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function safeIncrByFloat(key, amount) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    throw new Error(`Invalid float value: ${amount}`);
  }
  return redis.incrbyfloat(key, numAmount);
}

async function safeZadd(key, scoreMemberPairs) {
  const args = [];
  for (const [score, member] of scoreMemberPairs) {
    const numScore = parseFloat(score);
    if (isNaN(numScore)) {
      throw new Error(`Invalid score ${score} for member ${member}`);
    }
    args.push(numScore, member);
  }
  return redis.zadd(key, ...args);
}
```

## Checking Current Value Type

```bash
# Check if a key holds a valid float
redis-cli GET mykey
redis-cli OBJECT ENCODING mykey  # Should be "embstr" or "int"

# Try to parse it
python3 -c "print(float('$(redis-cli GET mykey)'))"
```

## Summary

The "ERR value is not a valid float" error occurs when Redis commands like INCRBYFLOAT or ZADD receive a non-numeric or improperly formatted value. Prevent it by validating that values are numeric before sending them to Redis, handle locale-specific number formatting by normalizing decimals to the period separator, and wrap Redis float operations in type-safe helper functions that validate inputs before calling the client library.
