# How Redis Listpack Data Structure Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Listpack, Internal, Memory, Data Structure

Description: Understand Redis listpack compact sequential encoding, how it stores elements without per-element pointers, and why it uses less memory than hashtable or skiplist.

---

## What Is Listpack

Listpack is a compact sequential data structure first introduced in Redis 5.0 for Streams. In Redis 7.0 it replaced the older ziplist encoding for Hashes, Sorted Sets, and Lists. It stores a sequence of string or integer entries in a contiguous memory block with no per-element pointers.

Redis uses listpack as the compact encoding for:
- Small Hashes (below `hash-max-listpack-entries` and `hash-max-listpack-value`)
- Small Sorted Sets (below `zset-max-listpack-entries` and `zset-max-listpack-value`)
- Small Sets (Redis 7.2+, below `set-max-listpack-entries`)
- Small Lists (Redis 7.0+, per quicklist node)

## Memory Layout

A listpack is a contiguous byte array with this structure:

```text
+--------+--------+-----+-------+-----+-------+----+
| total  | num    | e1  | e2    | ... | eN    | FF |
| bytes  | entries|     |       |     |       |    |
| 4 bytes| 2 bytes|     |       |     |       |    |
+--------+--------+-----+-------+-----+-------+----+
```

Each entry (element) has:
```text
+----------+---------+
| encoding | backlen |
| + data   |         |
+----------+---------+
```

- `encoding + data` - type encoding followed by the actual value bytes
- `backlen` - total length of this entry's encoding+data, stored at the end of the entry (enables backward traversal)

## Advantages Over Ziplist

Listpack improves on ziplist by eliminating the "cascading update" problem:

```text
Ziplist problem:
- Changing prevlen field can cascade to next entry if size changes
- Worst case O(N) updates when inserting a medium-sized entry

Listpack fix:
- Each entry stores only its own size, not previous entry size
- Backward traversal uses a different mechanism (backlen suffix at the end of each entry)
- No cascading updates - O(1) insertion at known position
```

## Integer Encoding

Listpack uses compact integer encodings to save space:

```text
7-bit uint  (0-127):    1 byte total
13-bit int  (±4095):    2 bytes total
16-bit int  (±32767):   3 bytes total
24-bit int  (±8388607): 4 bytes total
32-bit int:             5 bytes total
64-bit int:             9 bytes total
```

For comparison, storing "12345" as a string takes 6+ bytes (1 header + 5 digits). As a 16-bit integer it takes 3 bytes.

## String Encoding

```text
6-bit length  (0-63 bytes):   1 byte header + data
12-bit length (0-4095 bytes): 2 byte header + data
32-bit length (any size):     5 byte header + data
```

## Verifying Listpack Encoding

```bash
# Small hash uses listpack
redis-cli HSET product:1 name "Widget" price "9.99" category "tools"
redis-cli OBJECT ENCODING product:1
# Output: listpack

# Check memory usage
redis-cli MEMORY USAGE product:1
# Typically 80-150 bytes for a small hash

# Force to hashtable (add many fields)
for i in $(seq 1 130); do
  redis-cli HSET product:1 "field$i" "value$i" > /dev/null
done
redis-cli OBJECT ENCODING product:1
# Output: hashtable
redis-cli MEMORY USAGE product:1
# Now significantly larger (typically 8-15 KB)
```

## Time Complexity

Listpack operations have different complexity than hashtable:

```text
Operation       Listpack    Hashtable
---------       --------    ---------
HGET            O(N)        O(1)
HSET            O(N)        O(1)
HDEL            O(N)        O(1)
HGETALL         O(N)        O(N)
HLEN            O(1)*       O(1)

*stored in header
```

For small N (below threshold), O(N) listpack is faster than O(1) hashtable due to CPU cache locality (all data in contiguous memory).

## Listpack in Sorted Sets

In Sorted Sets, listpack stores member-score pairs sequentially:

```text
[member1][score1][member2][score2]...[memberN][scoreN]
```

```bash
redis-cli ZADD scores 100 "alice" 200 "bob" 150 "charlie"
redis-cli OBJECT ENCODING scores
# listpack

# Internally stored as:
# [alice][100.0][charlie][150.0][bob][200.0]
# (sorted by score within the listpack)
```

## Listpack in Lists (Quicklist Nodes)

Lists use quicklist, which is a linked list of listpack nodes:

```bash
redis-cli CONFIG GET list-max-listpack-size
# -2 (default: each node max 8kb)

# A list with few small elements uses a single listpack node
redis-cli RPUSH mylist "a" "b" "c"
redis-cli OBJECT ENCODING mylist
# quicklist (always, but internally uses listpack nodes)

redis-cli OBJECT HELP  # List encoding details
redis-cli DEBUG OBJECT mylist
# Includes: ql_nodes:1 ql_avg_node:3.00 ql_ziplist_max:-2 ql_compressed:0 ql_uncompressed:1
```

## Configuration Thresholds

```bash
# Hash
redis-cli CONFIG SET hash-max-listpack-entries 128
redis-cli CONFIG SET hash-max-listpack-value 64

# Sorted Set
redis-cli CONFIG SET zset-max-listpack-entries 128
redis-cli CONFIG SET zset-max-listpack-value 64

# Set (Redis 7.2+)
redis-cli CONFIG SET set-max-listpack-entries 128
redis-cli CONFIG SET set-max-listpack-value 64
```

## Summary

Listpack stores Redis collection entries in a flat, contiguous byte array without per-element pointer overhead. Its compact integer and string encodings reduce memory usage by 3-10x compared to hashtable encoding for small collections. The trade-off is O(N) lookup time, which is acceptable for small collections where cache-friendly sequential reads outperform pointer-chasing in hashtables.
