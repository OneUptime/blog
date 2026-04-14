# How to Model One-to-One Relationships in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Modeling, Hash, Key-Value

Description: Model one-to-one relationships in Redis using hashes, flat keys, and bidirectional lookup patterns, with examples for user profiles and session mapping.

---

Redis is a key-value store, but it handles one-to-one relationships naturally. The key question is which data structure to use and whether you need bidirectional lookup.

## Approach 1: Single Hash per Entity

The most common pattern for a one-to-one relationship between an ID and its attributes:

```bash
# User and their profile (one user has one profile)
HSET user:42 name "Alice" email "alice@example.com" plan "pro" created "2026-01-01"

# Read full profile
HGETALL user:42

# Read single field
HGET user:42 email
```

This is efficient because:
- One key = one entity (no duplication)
- `MEMORY USAGE` shows exact cost
- All attributes in a single fetch

## Approach 2: Embedding the Related Entity

When both sides of a relationship are always accessed together, embed:

```bash
# User and their settings in one hash
HSET user:42 \
  name "Alice" \
  email "alice@example.com" \
  settings:theme "dark" \
  settings:notifications "true" \
  settings:timezone "UTC"

# Access embedded settings
HGET user:42 settings:theme
```

## Approach 3: Separate Keys with Cross-Reference

When each entity is large or accessed independently:

```bash
# User key stores reference to settings
HSET user:42 name "Alice" settings_key "settings:42"
HSET settings:42 theme "dark" notifications "true"

# Lookup in two steps
settings_key=$(redis-cli HGET user:42 settings_key)
redis-cli HGETALL "$settings_key"
```

## Bidirectional Lookup

For relationships like "email -> user ID" and "user ID -> email":

```bash
# Forward: user ID to email
HSET user:42 email "alice@example.com"

# Reverse: email to user ID
SET "email:alice@example.com" 42

# Lookup by email
redis-cli GET "email:alice@example.com"  # returns 42
```

```python
import redis

r = redis.Redis(decode_responses=True)

def create_user(r, user_id, name, email):
    pipe = r.pipeline()
    pipe.hset(f"user:{user_id}", mapping={"name": name, "email": email})
    pipe.set(f"email:{email}", user_id)
    pipe.execute()

def find_by_email(r, email):
    user_id = r.get(f"email:{email}")
    if user_id:
        return r.hgetall(f"user:{user_id}")
    return None

def delete_user(r, user_id):
    email = r.hget(f"user:{user_id}", "email")
    pipe = r.pipeline()
    pipe.delete(f"user:{user_id}")
    if email:
        pipe.delete(f"email:{email}")
    pipe.execute()

create_user(r, 42, "Alice", "alice@example.com")
print(find_by_email(r, "alice@example.com"))
# {'name': 'Alice', 'email': 'alice@example.com'}
```

## One-to-One with Expiry (Session to User)

```python
SESSION_TTL = 3600  # 1 hour

def create_session(r, session_token, user_id):
    pipe = r.pipeline()
    pipe.set(f"session:{session_token}", user_id, ex=SESSION_TTL)
    pipe.set(f"user_session:{user_id}", session_token, ex=SESSION_TTL)
    pipe.execute()

def get_user_from_session(r, token):
    return r.get(f"session:{token}")

def logout(r, session_token):
    user_id = r.get(f"session:{session_token}")
    pipe = r.pipeline()
    pipe.delete(f"session:{session_token}")
    if user_id:
        pipe.delete(f"user_session:{user_id}")
    pipe.execute()
```

## Choosing Between Approaches

```text
Situation                          Approach
Small profile, always together     Single hash
Settings separate from user        Separate keys + reference
Lookup by secondary attribute      Bidirectional keys
Relationship has TTL               Two keys with EXPIRE
Write to both sides atomically     MULTI/EXEC transaction
```

## Atomic Writes for Consistency

When both sides must be consistent:

```python
def atomic_link(r, user_id, email):
    pipe = r.pipeline()
    pipe.multi()
    pipe.hset(f"user:{user_id}", "email", email)
    pipe.set(f"email:{email}", user_id)
    pipe.execute()
```

MULTI/EXEC ensures both commands execute atomically - no other client will see a state where only one side is written. However, if the server crashes before the transaction is persisted to disk, the entire transaction (not just one side) could be lost depending on your AOF fsync policy.

## Summary

One-to-one relationships in Redis are modeled with a single hash for simple attribute mappings, or with cross-referencing keys for bidirectional lookups. Use a hash to store all entity attributes and maintain secondary lookup keys (e.g., email-to-ID) as simple string keys. Always update both sides atomically using MULTI/EXEC to avoid inconsistency.
