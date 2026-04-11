# How Redis Object Encoding System Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Internal, Object Encoding, Memory Optimization, Data Structure

Description: Understand how Redis automatically selects compact or full encodings for each data type based on size thresholds to minimize memory usage.

---

## What Is Object Encoding

Every Redis value is stored as a `redisObject` C struct containing:
- A type field (String, List, Hash, Set, Sorted Set, Stream)
- An encoding field (the internal representation)
- A pointer to the actual data
- Reference count and LRU information

Redis automatically switches between compact (memory-efficient) and full (performance-optimized) encodings based on configurable thresholds.

## Checking Encoding

```bash
# Check the encoding of any key
redis-cli OBJECT ENCODING mykey

# Check encoding after various operations
redis-cli SET mykey 42
redis-cli OBJECT ENCODING mykey
# Output: int

redis-cli SET mykey "hello"
redis-cli OBJECT ENCODING mykey
# Output: embstr

redis-cli SET mykey "$(head -c 45 /dev/urandom | base64)"
redis-cli OBJECT ENCODING mykey
# Output: raw
```

## String Encodings

Redis uses three encodings for String values:

```text
int:     Value is an integer that fits in a long (e.g., "12345")
embstr:  Value is <= 44 bytes (allocated as single block with redisObject)
raw:     Value is > 44 bytes (allocated separately, more fragmentation)
```

```bash
redis-cli SET counter 0
redis-cli OBJECT ENCODING counter
# int

redis-cli SET name "Alice"
redis-cli OBJECT ENCODING name
# embstr

redis-cli SET bio "Alice is a software engineer with over 10 years of experience building..."
redis-cli OBJECT ENCODING bio
# raw

# Numbers stored as strings
redis-cli SET price "9.99"
redis-cli OBJECT ENCODING price
# embstr (not int, because it's a float string)
```

## List Encodings

```text
listpack:  Small lists below list-max-listpack-size threshold
quicklist: Larger lists (a linked list of listpack nodes)
```

```bash
redis-cli CONFIG GET list-max-listpack-size
# -2 (default: 8kb per listpack node)

redis-cli RPUSH smalllist a b c
redis-cli OBJECT ENCODING smalllist
# listpack (few elements)

# After adding many elements:
redis-cli OBJECT ENCODING largelist
# quicklist
```

## Hash Encodings

```text
listpack:  Entries <= hash-max-listpack-entries AND values <= hash-max-listpack-value
hashtable: Otherwise
```

```bash
redis-cli CONFIG GET hash-max-listpack-entries
# 128

redis-cli CONFIG GET hash-max-listpack-value
# 64

redis-cli HSET smhash f1 v1 f2 v2
redis-cli OBJECT ENCODING smhash
# listpack

# Add many fields or a large value
redis-cli HSET bighash description "$(head -c 65 /dev/urandom | base64)"
redis-cli OBJECT ENCODING bighash
# hashtable
```

## Set Encodings

```text
intset:    All members are integers AND count <= set-max-intset-entries
listpack:  Non-integer members, count <= set-max-listpack-entries
hashtable: Otherwise
```

```bash
redis-cli CONFIG GET set-max-intset-entries
# 512

redis-cli SADD intset 1 2 3 4 5
redis-cli OBJECT ENCODING intset
# intset

redis-cli SADD strset "apple" "banana" "cherry"
redis-cli OBJECT ENCODING strset
# listpack

# Adding a non-integer to an intset converts it
redis-cli SADD intset "string"
redis-cli OBJECT ENCODING intset
# listpack (count is still below set-max-listpack-entries)
```

## Sorted Set Encodings

```text
listpack:  Entries <= zset-max-listpack-entries AND values <= zset-max-listpack-value
skiplist:  Otherwise (uses a hash table + skip list combination)
```

```bash
redis-cli CONFIG GET zset-max-listpack-entries
# 128

redis-cli ZADD leaderboard 100 alice 200 bob 150 charlie
redis-cli OBJECT ENCODING leaderboard
# listpack

# Large sorted set
redis-cli OBJECT ENCODING large-leaderboard
# skiplist
```

## Encoding Conversion Is One-Way

Redis automatically upgrades from compact to full encoding when thresholds are exceeded. It does NOT downgrade back:

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Start with listpack
await redis.hset('myhash', 'f1', 'v1');
console.log(await redis.object('ENCODING', 'myhash')); // listpack

// Add 130 fields - triggers conversion to hashtable
for (let i = 0; i < 130; i++) {
  await redis.hset('myhash', `field${i}`, `value${i}`);
}
console.log(await redis.object('ENCODING', 'myhash')); // hashtable

// Remove 120 fields - stays hashtable (no downgrade)
for (let i = 0; i < 120; i++) {
  await redis.hdel('myhash', `field${i}`);
}
console.log(await redis.object('ENCODING', 'myhash')); // still hashtable
```

## Memory Impact of Encoding

```bash
# Compare memory for small hash in different encodings
redis-cli HSET hash-lp f1 v1 f2 v2 f3 v3
redis-cli MEMORY USAGE hash-lp
# ~120 bytes (listpack)

# Force hashtable encoding by exceeding threshold temporarily
redis-cli HSET hash-ht f1 v1 f2 v2 f3 v3 # (after previously exceeding threshold)
redis-cli MEMORY USAGE hash-ht
# ~400-600 bytes (hashtable)
```

## Tuning Thresholds for Memory vs Speed

```bash
# Increase listpack thresholds to use more compact encoding
# Trade: slightly slower lookups for large-ish small hashes
redis-cli CONFIG SET hash-max-listpack-entries 256
redis-cli CONFIG SET hash-max-listpack-value 128
redis-cli CONFIG SET zset-max-listpack-entries 256
redis-cli CONFIG SET set-max-listpack-entries 256

# Save to config
redis-cli CONFIG REWRITE
```

## Summary

Redis's object encoding system automatically selects the most memory-efficient representation for each value based on its size. Small collections use compact listpack, intset, or embstr encodings that save significant memory, while larger collections use full hashtable or skiplist encodings for O(1) or O(log N) access. Tune the threshold configurations to match your data distribution and optimize the balance between memory usage and access performance.
