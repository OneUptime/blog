# Redis String Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, String, Command, Cheat Sheet, Cache

Description: A complete Redis string commands cheat sheet covering SET, GET, MSET, INCR, APPEND, GETRANGE, and all string operation options.

---

Redis strings are the most fundamental data type. They can store text, numbers, serialized JSON, or binary data up to 512 MB. Here is a comprehensive reference for all string commands.

## SET and GET

```bash
# Basic set and get
SET key "hello"
GET key                 # returns "hello"

# Set with expiration
SET key "value" EX 60          # expire in 60 seconds
SET key "value" PX 60000       # expire in 60000 milliseconds
SET key "value" EXAT 1800000000  # expire at Unix timestamp

# Conditional set
SET key "value" NX    # only set if key does NOT exist
SET key "value" XX    # only set if key DOES exist

# Set and return old value
GETSET key "new_value"         # deprecated, use SET ... GET
SET key "new_value" GET        # returns old value

# Set with keep existing TTL
SET key "new_value" KEEPTTL
```

## Multi-Key Operations

```bash
# Set multiple keys
MSET key1 "a" key2 "b" key3 "c"

# Get multiple keys
MGET key1 key2 key3

# Set multiple keys only if none exist (atomic)
MSETNX key1 "a" key2 "b"
```

## Numeric Operations

```bash
# Increment / decrement integer
INCR counter             # +1
DECR counter             # -1
INCRBY counter 10        # +10
DECRBY counter 5         # -5
INCRBYFLOAT price 1.50   # +1.50 (float)
```

## String Manipulation

```bash
# Append to value
APPEND key " world"        # returns new length

# Get string length
STRLEN key

# Get substring
GETRANGE key 0 4          # characters 0-4 (inclusive)

# Overwrite part of string
SETRANGE key 6 "Redis"    # overwrite starting at offset 6

# Longest Common Subsequence (Redis 7.0+)
LCS key1 key2
LCS key1 key2 LEN         # return length only
LCS key1 key2 IDX         # return matching positions
```

## Bit Operations on Strings

```bash
# Set/get individual bits
SETBIT bitfield 7 1
GETBIT bitfield 7

# Count set bits
BITCOUNT key
BITCOUNT key 0 0     # count in first byte only

# Bitwise operations
BITOP AND destkey key1 key2
BITOP OR  destkey key1 key2
BITOP XOR destkey key1 key2
BITOP NOT destkey key1
```

## Useful Patterns

```bash
# Atomic counter with expiration (rate limiting)
SET ratelimit:user:42 0 EX 60
INCR ratelimit:user:42

# Cache JSON with TTL
SET user:42 '{"name":"Alice"}' EX 300

# Distributed lock (NX = exclusive, PX = auto-expire)
SET lock:resource unique_token NX PX 30000
```

## Summary

Redis string commands cover simple key-value storage, atomic counters, substring manipulation, and bit-level operations. The `SET` command's options (EX, NX, XX, GET, KEEPTTL) make it versatile enough to implement caching, locks, and rate limiters in a single atomic operation.
