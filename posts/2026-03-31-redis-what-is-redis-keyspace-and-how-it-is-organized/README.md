# What Is Redis Keyspace and How It Is Organized

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace, Architecture

Description: Learn what the Redis keyspace is, how logical databases work, how keys are stored internally, and how to inspect and manage the keyspace effectively.

---

The Redis keyspace is the collection of all key-value pairs stored in a Redis instance. Understanding how it is organized - including logical databases, key naming conventions, and internal storage - helps you manage Redis data effectively.

## Logical Databases

By default, Redis supports 16 logical databases (numbered 0-15). Each database has its own keyspace. The default database is 0:

```bash
redis-cli SELECT 0
redis-cli SELECT 1
```

Each database's keyspace is completely isolated from others. A key named `user:1` in database 0 is different from `user:1` in database 1.

In Redis Cluster, only database 0 is supported.

## Viewing the Keyspace

Get a summary of all databases and their key counts:

```bash
redis-cli INFO keyspace
```

Output example:

```text
# Keyspace
db0:keys=15234,expires=8921,avg_ttl=3600000
db1:keys=100,expires=0,avg_ttl=0
```

## How Keys Are Stored Internally

Redis stores keys in a hash table (C dict structure). Each database maintains two hash tables:
- A main dictionary that maps keys (strings) to values (Redis objects of any type)
- A separate expires dictionary that maps keys to their expiration timestamps (if set)

The hash table rehashes automatically as keys are added or removed, maintaining O(1) average access time.

## Key Naming Conventions

Redis has no enforced naming convention, but common patterns use colons as separators:

```bash
SET user:1001:profile "..."
SET session:abc123 "..."
SET cache:product:42 "..."
```

This makes it easy to group related keys and scan for them:

```bash
redis-cli --scan --pattern "user:*"
redis-cli --scan --pattern "cache:product:*"
```

## Scanning the Keyspace

Never use KEYS in production - it blocks the server. Use SCAN instead:

```bash
redis-cli SCAN 0 COUNT 100
redis-cli SCAN 0 MATCH "user:*" COUNT 100
redis-cli SCAN 0 TYPE hash COUNT 100
```

SCAN is cursor-based and non-blocking. Iterate until the cursor returns to 0:

```python
import redis

r = redis.Redis()
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match="cache:*", count=100)
    for key in keys:
        print(key)
    if cursor == 0:
        break
```

## Keyspace Statistics

Check total key count:

```bash
redis-cli DBSIZE
```

Find the biggest keys and key type distribution:

```bash
redis-cli --bigkeys -i 0.05
```

## Summary

The Redis keyspace is a per-database hash table mapping keys to values. Redis supports up to 16 logical databases by default. Use colon-separated key naming conventions for logical grouping. Always use SCAN instead of KEYS for keyspace inspection in production, as SCAN is cursor-based and non-blocking.
