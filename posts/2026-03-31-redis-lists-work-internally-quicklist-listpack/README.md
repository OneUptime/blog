# How Redis Lists Work Internally (Quicklist and Listpack)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, List, Quicklist, Listpack, Internal

Description: Understand how Redis lists use listpack for small lists and quicklist for larger ones, and how these encodings affect memory usage and performance.

---

Redis lists support push/pop from both ends in O(1) and random access by index. Internally, Redis chooses between two encodings - `listpack` for small lists and `quicklist` for larger ones - to balance memory efficiency and performance.

## The Two List Encodings

```bash
RPUSH mylist a b c
OBJECT ENCODING mylist
# Returns: "listpack" (small list)

# Add many elements to trigger quicklist
python3 -c "import redis; r=redis.Redis(); [r.rpush('biglist', i) for i in range(200)]"
```

```bash
OBJECT ENCODING biglist
# Returns: "quicklist"
```

## Listpack Encoding

For lists with few elements and small values, Redis uses a `listpack` - a compact, flat byte array:

```text
+--------+--------+--------+-----+--------+--------+
| total  | entry0 | entry1 | ... | entryN | end    |
| bytes  | (len+data) ...                 | 0xFF   |
+--------+--------+--------+-----+--------+--------+
```

Each entry stores its own length prefix, allowing forward traversal. The thresholds for listpack encoding:

```bash
# Check or change thresholds (Redis 7.x defaults)
CONFIG GET list-max-listpack-size
# Returns: -2 (meaning max 8KB per node)

CONFIG GET list-max-ziplist-size   # legacy alias
```

With the default value of `-2`, a list uses listpack encoding until the data exceeds 8KB, then converts to quicklist. Negative values set size-based limits:

- `-1` = 4KB, `-2` = 8KB, `-3` = 16KB, `-4` = 32KB, `-5` = 64KB

A positive value (e.g., `128`) sets the maximum number of entries per node instead.

## Quicklist Encoding

A quicklist is a doubly-linked list of listpack nodes:

```text
[listpack node] <-> [listpack node] <-> [listpack node]
  [a, b, c, d]       [e, f, g, h]       [i, j, k]
```

This design gives O(1) head/tail operations while keeping each node compact and cache-friendly.

```bash
# Tune quicklist node compression (0 = no compression)
CONFIG SET list-compress-depth 1
# Compresses all nodes except the first and last 1
```

With `list-compress-depth 1`, inner nodes are LZF-compressed, trading CPU for memory.

## Practical Impact

```bash
# Small list: very memory efficient
RPUSH session:items "cart_item_1" "cart_item_2"
OBJECT ENCODING session:items
# Returns: "listpack"

# Large list: quicklist takes over
RPUSH log:events item1 item2 ... item200
OBJECT ENCODING log:events
# Returns: "quicklist"
```

## Tuning for Your Use Case

```bash
# For queues with many small strings, increase listpack threshold
CONFIG SET list-max-listpack-size 256

# For memory-constrained environments with large lists, enable compression
CONFIG SET list-compress-depth 2
```

Check memory savings:

```bash
MEMORY USAGE mylist
DEBUG OBJECT mylist
# Shows encoding and serialized length
```

## When Lists Are the Right Choice

- **Job queues**: `LPUSH` + `BRPOP` for reliable task distribution
- **Activity feeds**: `LPUSH` + `LRANGE` to show recent N events
- **Deques**: double-ended push/pop with `LPUSH`/`RPUSH`/`LPOP`/`RPOP`
- **Chat history**: `LPUSH` + `LTRIM` to keep last N messages

```bash
# Maintain a capped activity feed
LPUSH user:123:feed "liked post 456"
LTRIM user:123:feed 0 99   # Keep only latest 100
```

## Summary

Redis lists automatically use `listpack` for small collections and `quicklist` for larger ones. Quicklist breaks the list into listpack-encoded nodes, enabling O(1) head/tail access and optional LZF compression on inner nodes. Tune `list-max-listpack-size` and `list-compress-depth` to optimize for your specific workload's memory and CPU tradeoffs.
