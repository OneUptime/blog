# How to Design Redis Keys for Query Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Key Design, Data Modeling, Query Pattern, Performance, Best Practice

Description: Design Redis key schemas that align with your query patterns using consistent naming conventions, secondary indexes, and data structure selection to optimize performance.

---

## The Core Principle

In Redis, unlike SQL, you do not query arbitrary fields - you query by key. Every access pattern your application needs must be pre-designed as a key. Effective key design starts by listing all required queries before writing a single command.

## Key Naming Conventions

Use colon-separated hierarchical names:

```text
{entity_type}:{entity_id}:{attribute}
{prefix}:{tenant}:{entity_type}:{entity_id}
```

Examples:

```bash
user:101:profile
user:101:sessions
order:5001:items
product:1001:reviews
tenant:acme:user:101:profile
```

## Query Pattern 1 - Lookup by ID

The simplest pattern: store entity data as a hash, key by ID.

```bash
HSET user:101 name "Alice" email "alice@example.com" created_at "1711900000"
HGET user:101 email
HGETALL user:101
```

## Query Pattern 2 - Lookup by Secondary Index

To find users by email, maintain a secondary index:

```bash
# Map email to user ID
SET idx:user:email:alice@example.com 101

# Lookup
GET idx:user:email:alice@example.com
# Returns: 101
# Then fetch: HGETALL user:101
```

## Query Pattern 3 - List Entities by Parent

Store a set of child IDs under the parent key:

```bash
# Orders belonging to user 101
SADD user:101:orders 5001 5002 5003

# Get all orders for user 101
SMEMBERS user:101:orders
```

## Query Pattern 4 - Sorted/Paginated Lists

Use sorted sets for paginated, ordered collections:

```bash
# Recent orders by user (score = timestamp)
ZADD user:101:orders:recent 1712000000 5001
ZADD user:101:orders:recent 1712010000 5002
ZADD user:101:orders:recent 1712020000 5003

# Last 10 orders (newest first)
ZRANGE user:101:orders:recent 0 9 REV

# Page 2 of orders
ZRANGE user:101:orders:recent 10 19 REV
```

## Query Pattern 5 - Range Queries

Use sorted sets with numeric scores for range queries:

```bash
# Products indexed by price
ZADD products:by_price 29.99 1001
ZADD products:by_price 49.99 1002
ZADD products:by_price 89.99 1003

# Products between $30 and $60
ZRANGE products:by_price 30 60 BYSCORE
```

## Query Pattern 6 - Tag/Category Indexes

Use sets to implement tag-based filtering:

```bash
SADD tag:redis article:101 article:205
SADD tag:caching article:101 article:310

# Articles tagged with both redis and caching
SINTER tag:redis tag:caching
```

## Key Design for Time-Series Patterns

Use time-bucketed keys for time-series data to avoid unbounded key growth:

```bash
# Daily request counts per service
INCR metrics:api:2024-04-01:requests
INCR metrics:api:2024-04-02:requests

# Set TTL to auto-expire old buckets
EXPIRE metrics:api:2024-04-01:requests 2592000
```

## Key Length and Memory

Short keys save memory. Compare these equivalents:

```text
user:101:settings           - readable, reasonable
u:101:s                     - compact, harder to read
user_settings_for_id_101    - verbose, avoid
```

Profile key memory cost:

```bash
MEMORY USAGE user:101
```

## Python Key Builder Pattern

```python
class KeyBuilder:
    def user(self, user_id: str) -> str:
        return f"user:{user_id}"

    def user_sessions(self, user_id: str) -> str:
        return f"user:{user_id}:sessions"

    def user_orders(self, user_id: str) -> str:
        return f"user:{user_id}:orders"

    def order(self, order_id: str) -> str:
        return f"order:{order_id}"

    def product(self, product_id: str) -> str:
        return f"product:{product_id}"

    def email_index(self, email: str) -> str:
        return f"idx:user:email:{email}"

    def price_index(self) -> str:
        return "products:by_price"

keys = KeyBuilder()
print(keys.user("101"))
print(keys.user_sessions("101"))
print(keys.email_index("alice@example.com"))
```

## Designing Keys for Atomic Operations

When multiple keys must be updated atomically in Redis Cluster, use hash tags to co-locate them on the same slot:

```bash
# Both keys use {user:101} as hash tag - same slot
SET {user:101}:profile "..."
SET {user:101}:session:tok123 "..."

# MGET works because both keys hash to the same slot
MGET {user:101}:profile {user:101}:session:tok123
```

## Summary

Effective Redis key design requires mapping each access pattern to a specific key schema before writing code. Secondary indexes using simple strings or sets enable lookup by non-ID fields. Sorted sets handle pagination and range queries, while hash tags in Redis Cluster ensure related keys land on the same shard for atomic multi-key operations.
