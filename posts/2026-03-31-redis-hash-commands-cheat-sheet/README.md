# Redis Hash Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hash, Command, Cheat Sheet, Object Storage

Description: A complete Redis hash commands reference covering HSET, HGET, HMGET, HGETALL, HINCRBY, HSCAN, and all field-level operations.

---

Redis hashes store field-value pairs in a single key, making them ideal for representing objects. Here is a complete reference for all hash commands.

## Basic Set and Get

```bash
# Set one or more fields
HSET user:42 name "Alice" email "alice@example.com" age 30

# Get a single field
HGET user:42 name           # returns "Alice"

# Get multiple fields
HMGET user:42 name email    # returns ["Alice", "alice@example.com"]

# Get all fields and values
HGETALL user:42

# Set only if field does NOT exist
HSETNX user:42 name "Bob"   # no-op if name already exists
```

## Check and Delete

```bash
# Check if field exists
HEXISTS user:42 name        # returns 1 or 0

# Delete one or more fields
HDEL user:42 age

# Count number of fields
HLEN user:42
```

## Numeric Fields

```bash
# Increment integer field
HINCRBY user:42 age 1       # add 1 to age

# Increment float field
HINCRBYFLOAT product:1 price 0.50
```

## Listing Fields and Values

```bash
# Get all field names
HKEYS user:42

# Get all field values
HVALS user:42

# Get random field names
HRANDFIELD user:42 2        # 2 random fields
HRANDFIELD user:42 -2       # 2 random fields (may repeat)
HRANDFIELD user:42 2 WITHVALUES
```

## Scanning Large Hashes

```bash
# Iterate fields (cursor-based, safe for large hashes)
HSCAN user:42 0 COUNT 10
HSCAN user:42 0 MATCH "a*"   # fields starting with "a"
```

## Field-Level TTL (Redis 7.4+)

```bash
# Set expiration on individual fields
HEXPIRE user:42 3600 FIELDS 2 session_token last_login

# Get remaining TTL on fields
HTTL user:42 FIELDS 1 session_token      # seconds
HPTTL user:42 FIELDS 1 session_token     # milliseconds

# Remove field expiration
HPERSIST user:42 FIELDS 1 session_token

# Get and delete field in one operation
HGETDEL user:42 FIELDS 1 session_token

# Get and set expiration
HGETEX user:42 EX 60 FIELDS 1 session_token
HSETEX user:42 60 FIELDS 1 session_token "abc123"
```

## Common Patterns

```bash
# Store a user object
HSET user:42 id 42 name "Alice" email "alice@example.com" \
     created_at 1711900000 status "active"

# Partial update (update only changed fields)
HSET user:42 email "newemail@example.com"

# Atomic counter within a hash
HINCRBY stats:2026-03-31 page_views 1
HINCRBY stats:2026-03-31 unique_visitors 1

# Cache complex object with TTL
HSET session:abc token "xyz" user_id 42 expires 1711900300
EXPIRE session:abc 3600
```

## Summary

Redis hash commands provide field-level get, set, increment, and delete operations. For large hashes, use HSCAN for safe iteration. Redis 7.4+ added per-field TTL via HEXPIRE and HTTL, enabling fine-grained expiration without storing separate keys for each field.
