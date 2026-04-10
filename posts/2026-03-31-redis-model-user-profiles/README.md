# How to Model User Profiles in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Modeling, Hash, User Profile, Caching

Description: Learn how to model user profiles in Redis using Hashes, with strategies for partial updates, field expiry, and combining with a primary database.

---

Storing user profiles in Redis gives you fast sub-millisecond reads while keeping frequently accessed data close to your application. Redis Hashes are the natural fit - they map directly to the fields of a user profile and allow partial reads and writes without serializing the entire object.

## Choosing the Right Data Structure

Use a Hash per user. The key naming convention should encode the entity type and identifier clearly:

```text
user:{user_id}          -> Hash of profile fields
user:{user_id}:prefs    -> Hash of user preferences
user:{user_id}:sessions -> Set of active session tokens
```

## Storing and Retrieving a Profile

```bash
# Store a user profile
HSET user:1001 name "Alice" email "alice@example.com" role "admin" created_at "2024-01-15"

# Retrieve the full profile
HGETALL user:1001

# Retrieve specific fields only
HMGET user:1001 name email

# Update a single field without touching others
HSET user:1001 email "alice@newdomain.com"
```

This approach means you never have to read-modify-write the whole object just to change one field.

## Setting TTL on Profile Caches

If Redis is a cache in front of a primary database, expire profile entries after inactivity:

```bash
# Set profile with 24-hour TTL
HSET user:1001 name "Alice" email "alice@example.com"
EXPIRE user:1001 86400

# Reset TTL on each access (sliding expiry)
EXPIRE user:1001 86400
```

## Atomic Counter Fields

Track metrics like login count or points directly in the Hash:

```bash
# Increment login counter atomically
HINCRBY user:1001 login_count 1

# Increment float fields (e.g., loyalty points)
HINCRBYFLOAT user:1001 loyalty_points 5.5
```

## Python Example: Profile Cache

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_user_profile(user_id: str) -> dict:
    key = f"user:{user_id}"
    profile = r.hgetall(key)
    if not profile:
        # Cache miss - load from primary DB
        profile = load_from_database(user_id)
        r.hset(key, mapping=profile)
        r.expire(key, 86400)
    else:
        # Refresh TTL on access
        r.expire(key, 86400)
    return profile

def update_user_field(user_id: str, field: str, value: str):
    key = f"user:{user_id}"
    r.hset(key, field, value)
    r.expire(key, 86400)
```

## Handling Profile Deletion

When a user is deleted, remove all related keys:

```bash
DEL user:1001
DEL user:1001:prefs
DEL user:1001:sessions
```

In production, use a Lua script or transaction (`MULTI/EXEC`) to make the deletion atomic.

## Avoiding Nested Objects

Redis Hashes store flat string values. If you need nested data (e.g., address), either flatten it or store it as a JSON string in a separate key:

```bash
# Flattened approach
HSET user:1001 addr_city "New York" addr_zip "10001"

# JSON string in separate key
SET user:1001:address '{"city":"New York","zip":"10001"}'
```

The flattened approach allows field-level updates; the JSON approach is simpler but requires rewriting the whole object on update.

## Summary

Redis Hashes are ideal for user profiles because they support partial reads and writes, atomic increments, and efficient memory usage. Use a consistent key naming scheme, set TTLs when Redis acts as a cache, and flatten nested objects to take full advantage of Hash field operations. Combine Redis with a primary database for durability, using Redis as the fast read layer.
