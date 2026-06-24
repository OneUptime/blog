# What Is New in Redis 6.2 (GETDEL, COPY, LMPOP)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Command, Feature, COPY, GETDEL

Description: Redis 6.2 added practical new commands including GETDEL, GETEX, COPY, LMPOP, ZMPOP, and improvements to EXPIRE and OBJECT ENCODING.

---

Redis 6.2, released in February 2021, focused on filling gaps in the command API with new atomic operations and quality-of-life improvements for common patterns. Redis 7.0, released in April 2022, continued this effort with additional commands and encoding improvements.

## GETDEL - Atomic Get and Delete

Before 6.2, atomically reading and deleting a key required Lua scripts. `GETDEL` does it in one command:

```bash
redis-cli SET token:abc "session-data"

redis-cli GETDEL token:abc
# "session-data"  (key is now deleted)

redis-cli EXISTS token:abc
# (integer) 0
```

Useful for one-time-use tokens, idempotency keys, and dequeue patterns.

## GETEX - Get with Expiry Options

`GETEX` returns the value and optionally sets or clears the TTL:

```bash
# Get and set new TTL to 300 seconds
redis-cli GETEX session:xyz EX 300

# Get and set TTL in milliseconds
redis-cli GETEX session:xyz PX 300000

# Get and make key persistent (remove TTL)
redis-cli GETEX session:xyz PERSIST

# Get with Unix timestamp expiry
redis-cli GETEX session:xyz EXAT 1800000000
```

This replaces the common `GET` + `EXPIRE` pattern with a single atomic operation.

## COPY - Copy Key to New Name

`COPY` duplicates a key to a new name without a rename:

```bash
redis-cli SET original "Hello"

redis-cli COPY original backup
# (integer) 1

redis-cli GET backup
# "Hello"

redis-cli GET original
# "Hello"  (original still exists)
```

Copy to a different database:

```bash
redis-cli COPY user:config user:config-backup DB 1
```

By default, `COPY` fails if the destination exists. Use `REPLACE` to overwrite:

```bash
redis-cli COPY original backup REPLACE
```

## LMPOP / ZMPOP - Pop from Multiple Keys (Redis 7.0)

`LMPOP` was introduced in Redis 7.0 (not 6.2). It pops elements from the first non-empty list in a list of keys:

```bash
redis-cli LPUSH queue:high "urgent-task"
redis-cli LPUSH queue:low "normal-task"

# Pop from whichever queue has items first
redis-cli LMPOP 2 queue:high queue:low LEFT COUNT 1
# 1) "queue:high"
# 2) 1) "urgent-task"
```

`ZMPOP` (also Redis 7.0) does the same for sorted sets:

```bash
redis-cli ZADD jobs:priority 100 "job-A" 50 "job-B"
redis-cli ZMPOP 1 jobs:priority MIN COUNT 1
# 1) "jobs:priority"
# 2) 1) "job-B"
#    2) "50"
```

## New EXPIRE Options (NX, XX, GT, LT) (Redis 7.0)

Redis 7.0 extended `EXPIRE`, `PEXPIRE`, `EXPIREAT`, and `PEXPIREAT` with condition flags:

```bash
# Set TTL only if no TTL exists (NX)
redis-cli EXPIRE mykey 3600 NX

# Set TTL only if TTL already exists (XX)
redis-cli EXPIRE mykey 7200 XX

# Set TTL only if new TTL is greater (GT)
redis-cli EXPIRE mykey 9000 GT

# Set TTL only if new TTL is less (LT)
redis-cli EXPIRE mykey 60 LT
```

## OBJECT ENCODING Improvements (Redis 7.0)

Redis 7.0 introduced `listpack` as the new compact encoding for small hashes, sorted sets, and lists, replacing `ziplist`. Redis 7.2 extended listpack to sets as well. This reduced memory usage and improved CPU cache efficiency.

```bash
redis-cli OBJECT ENCODING myhash
# "listpack"  (was "ziplist" in Redis < 7.0)
```

## Summary

Redis 6.2 delivered practical improvements including `GETDEL` and `GETEX` for atomic token patterns and `COPY` for non-destructive key duplication. Redis 7.0 followed with `LMPOP`/`ZMPOP` for priority queue patterns, conditional `EXPIRE` flags, and the `listpack` encoding. Together, these commands eliminate many common Lua script workarounds.
