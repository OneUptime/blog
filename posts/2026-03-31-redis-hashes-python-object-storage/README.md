# How to Use Redis Hashes in Python for Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Hash, Object Storage, redis-py

Description: Store and retrieve structured objects in Redis using hashes with redis-py, covering HSET, HGET, HMGET, HGETALL, and increments for counters.

---

Redis hashes are the natural data structure for storing objects - they map string field names to string values within a single key. They are more memory-efficient than storing a JSON string and allow you to read or update individual fields without fetching the entire object.

## Basic Hash Operations

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Store a user object
r.hset("user:1001", mapping={
    "name": "Alice",
    "email": "alice@example.com",
    "plan": "pro",
    "credits": "500",
})

# Read a single field
print(r.hget("user:1001", "name"))  # Alice

# Read multiple fields
fields = r.hmget("user:1001", ["name", "email"])
print(fields)  # ['Alice', 'alice@example.com']

# Read the entire hash
user = r.hgetall("user:1001")
print(user)  # {'name': 'Alice', 'email': 'alice@example.com', ...}
```

## Updating Individual Fields

```python
# Update one field without touching others
r.hset("user:1001", "plan", "enterprise")

# Add a new field
r.hset("user:1001", "verified", "true")

# Increment a numeric field
r.hincrby("user:1001", "credits", 100)
print(r.hget("user:1001", "credits"))  # 600

# Floating-point increment
r.hincrbyfloat("user:1001", "balance", 9.99)
```

## Checking and Deleting Fields

```python
# Check if a field exists
print(r.hexists("user:1001", "email"))  # True
print(r.hexists("user:1001", "phone"))  # False

# Delete specific fields
r.hdel("user:1001", "verified")

# Count fields in a hash
print(r.hlen("user:1001"))  # 5

# List all field names
print(r.hkeys("user:1001"))  # ['name', 'email', 'plan', 'credits', 'balance']

# List all values
print(r.hvals("user:1001"))  # ['Alice', 'alice@example.com', 'enterprise', '600', '9.99']
```

## Hash as a Model Layer

Wrap hash operations in helper functions:

```python
from dataclasses import dataclass, asdict
from typing import Optional

@dataclass
class UserProfile:
    name: str
    email: str
    plan: str = "free"
    credits: int = 0

def save_user(r: redis.Redis, user_id: int, user: UserProfile):
    r.hset(f"user:{user_id}", mapping={k: str(v) for k, v in asdict(user).items()})
    r.expire(f"user:{user_id}", 3600)

def load_user(r: redis.Redis, user_id: int) -> Optional[UserProfile]:
    data = r.hgetall(f"user:{user_id}")
    if not data:
        return None
    return UserProfile(
        name=data["name"],
        email=data["email"],
        plan=data.get("plan", "free"),
        credits=int(data.get("credits", 0)),
    )

# Usage
save_user(r, 1001, UserProfile(name="Alice", email="alice@example.com", plan="pro", credits=500))
user = load_user(r, 1001)
print(user)
```

## Memory Efficiency

Redis uses a compact listpack encoding for hashes with fewer than 128 fields and values shorter than 64 bytes (in Redis versions before 7.0, this encoding was called ziplist). Keep hashes small to benefit from this optimization.

Check current encoding:

```bash
redis-cli OBJECT ENCODING user:1001
```

## Summary

Redis hashes store structured objects as field-value pairs, enabling partial reads and writes without fetching the whole object. Use `hset` with a mapping dict for bulk writes, `hget`/`hmget` for field reads, and `hincrby` for atomic counter updates. Wrapping these in a dataclass-based helper layer keeps your application code clean and type-safe.
