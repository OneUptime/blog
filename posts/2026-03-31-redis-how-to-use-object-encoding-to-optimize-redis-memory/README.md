# How to Use OBJECT ENCODING to Optimize Redis Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory Optimization, Object Encoding, Data Structure, Performance

Description: Learn how Redis internal encodings work and how to use OBJECT ENCODING to identify and optimize memory usage across strings, hashes, lists, and sets.

---

## What Is OBJECT ENCODING

Redis uses different internal representations (encodings) for the same data type depending on the size and content of the data. These encodings trade memory efficiency for CPU overhead. Small data structures use compact encodings; as they grow, Redis upgrades them to more performant but memory-intensive formats.

The OBJECT ENCODING command reveals which internal format a key is using:

```bash
redis-cli OBJECT ENCODING mykey
```

Understanding and controlling encodings is one of the most effective ways to reduce Redis memory usage without changing application logic.

## String Encodings

Redis strings use three internal encodings:

- `int` - for values that fit in a 64-bit signed integer
- `embstr` - for strings up to 44 bytes (stored inline with the object header)
- `raw` - for strings longer than 44 bytes

```bash
SET counter 42
OBJECT ENCODING counter
# int

SET greeting "hello"
OBJECT ENCODING greeting
# embstr

SET longval "this string is definitely longer than forty-four bytes total"
OBJECT ENCODING longval
# raw
```

To optimize: keep values short where possible. Integer values use the most compact representation and benefit from Redis's shared integer pool (integers 0-9999 are pre-allocated).

## Hash Encodings

Hashes use two encodings:

- `listpack` (formerly ziplist) - compact sequential storage for small hashes
- `hashtable` - a full hash table for large hashes

```bash
HSET user:1 name Alice age 30
OBJECT ENCODING user:1
# listpack

# Add many fields to trigger upgrade
for i in $(seq 1 200); do redis-cli HSET user:1 "field$i" "value$i"; done
redis-cli OBJECT ENCODING user:1
# hashtable
```

Control the thresholds in redis.conf:

```text
hash-max-listpack-entries 128
hash-max-listpack-value 64
```

Listpack uses 5-10x less memory than hashtable for small hashes. Keep hashes within these limits when possible.

## List Encodings

Lists use:

- `listpack` - compact storage for small lists with short elements
- `quicklist` - a linked list of listpack nodes for larger lists

```bash
RPUSH mylist a b c
OBJECT ENCODING mylist
# listpack

# After adding many elements
for i in $(seq 1 600); do redis-cli RPUSH mylist "item$i"; done
redis-cli OBJECT ENCODING mylist
# quicklist
```

Configure the listpack threshold:

```text
list-max-listpack-size -2
```

The `-2` value means each listpack node can be up to 8 KB. Positive values set an element count limit per node.

## Set Encodings

Sets use three encodings:

- `intset` - for sets containing only integers (very compact)
- `listpack` - for small sets with short string members
- `hashtable` - for large sets or sets with long members

```bash
SADD nums 1 2 3 4 5
OBJECT ENCODING nums
# intset

SADD tags redis python database
OBJECT ENCODING tags
# listpack

# Large set
for i in $(seq 1 200); do redis-cli SADD bigset "member$i"; done
redis-cli OBJECT ENCODING bigset
# hashtable
```

Configure thresholds:

```text
set-max-intset-entries 512
set-max-listpack-entries 128
set-max-listpack-value 64
```

If all members are integers, intset provides the most compact storage. Keep integer sets within the intset-entries limit.

## Sorted Set Encodings

Sorted sets use:

- `listpack` - for small sorted sets
- `skiplist` - for larger sorted sets

```bash
ZADD scores 100 alice 200 bob
OBJECT ENCODING scores
# listpack

for i in $(seq 1 200); do redis-cli ZADD bigscores $i "player$i"; done
redis-cli OBJECT ENCODING bigscores
# skiplist
```

Configure:

```text
zset-max-listpack-entries 128
zset-max-listpack-value 64
```

## Practical Memory Comparison

Here is a practical comparison of memory usage across encodings for a hash:

```bash
# Create a small hash (listpack encoding)
redis-cli HSET small:hash f1 v1 f2 v2 f3 v3
redis-cli MEMORY USAGE small:hash
# ~120 bytes

# Create an equivalent with individual string keys
redis-cli SET small:f1 v1
redis-cli SET small:f2 v2
redis-cli SET small:f3 v3
redis-cli MEMORY USAGE small:f1
# ~56 bytes per key, ~168 bytes total + key overhead
```

Grouping related fields into a hash under the listpack encoding saves significant memory compared to flat string keys.

## Script to Audit Encodings Across Your Keyspace

```python
import redis

r = redis.Redis(host='localhost', port=6379)
encoding_counts = {}

cursor = 0
while True:
    cursor, keys = r.scan(cursor, count=100)
    for key in keys:
        try:
            enc = r.object_encoding(key)
            encoding_counts[enc] = encoding_counts.get(enc, 0) + 1
        except Exception:
            pass
    if cursor == 0:
        break

for enc, count in sorted(encoding_counts.items(), key=lambda x: -x[1]):
    print(f"{enc}: {count} keys")
```

## Forcing Compact Encodings

If your application stores numeric values as formatted strings, store plain integers instead:

```bash
# Before: stored as a formatted string (not parseable as an integer)
SET user:1:age "25 years"
OBJECT ENCODING user:1:age
# embstr

# After: store as plain integer
SET user:1:age 25
OBJECT ENCODING user:1:age
# int
```

For hashes, split large hashes into smaller bucketed hashes to stay within listpack limits:

```bash
# Instead of one large hash per user with 500 fields
# Use smaller grouped hashes
HSET user:1:profile name Alice email alice@example.com
HSET user:1:stats score 9850 level 42 games 123
```

## Summary

OBJECT ENCODING is an essential diagnostic tool for Redis memory optimization. Redis uses compact encodings (listpack, intset, embstr, int) for small data structures and automatically upgrades to full encodings as data grows. By keeping data structures within the configured thresholds and choosing appropriate data types, you can significantly reduce memory usage. Audit your keyspace with OBJECT ENCODING and MEMORY USAGE, then adjust hash-max-listpack-entries, set-max-intset-entries, and similar settings to match your actual data patterns.
