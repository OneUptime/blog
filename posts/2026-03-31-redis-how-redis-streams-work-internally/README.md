# How Redis Streams Work Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Internal, Radix Tree, Data Structure

Description: Understand how Redis Streams store data in a radix tree with listpack leaf nodes, how entry IDs work, and how consumer groups track state.

---

## Redis Streams Data Structure Overview

A Redis Stream is stored as a radix tree (also called a Patricia trie) where each node represents a prefix of an entry ID. Leaf nodes store entries compactly using the listpack encoding - the same compact binary format used by small hashes and lists.

This design provides:

- O(log N) insertion (appending to the end is O(1) amortized)
- Efficient range reads via ID-based traversal
- Memory-efficient storage via listpack compression

## Entry IDs

Every stream entry has a unique ID in the format `millisecond-sequence`:

```text
1711900000000-0    # First entry at timestamp 1711900000000
1711900000000-1    # Second entry at same millisecond
1711900001000-0    # Entry at next second
```

The auto-generated ID (`*`) uses the current Unix time in milliseconds. If two entries arrive in the same millisecond, the sequence number increments. This guarantees monotonic ordering.

You can also use custom IDs:

```bash
XADD mystream 1000-0 field value
XADD mystream 1000-1 field2 value2
```

IDs must be strictly increasing - attempting to add a lower ID returns an error:

```bash
XADD mystream 999-0 field value
# (error) ERR The ID specified in XADD is equal or smaller than the target stream top item
```

## Radix Tree with Listpack Leaves

Internally, the radix tree keys are the millisecond part of entry IDs. Entries within the same millisecond (or within a small range) are stored together in a listpack node.

A listpack is a sequential blob of bytes encoding multiple field-value pairs. Each element stores:

1. Encoding byte (string length or integer type)
2. Actual content (data bytes)
3. Back-length of the current entry (for backward traversal)

This is extremely memory-efficient for small values but cannot be randomly accessed by index - the entire listpack must be scanned linearly.

## When Listpack Nodes Split

Redis limits the size of each listpack node to prevent linear scan overhead:

```bash
redis-cli CONFIG GET stream-node-max-bytes
redis-cli CONFIG GET stream-node-max-entries
```

Defaults:

```text
stream-node-max-bytes: 4096  (4KB per node)
stream-node-max-entries: 100 (100 entries per node)
```

When either limit is exceeded, the listpack splits and a new radix tree node is created. Reduce these for smaller memory footprint; increase for better scan performance:

```bash
redis-cli CONFIG SET stream-node-max-entries 50
```

## Consumer Groups - State Storage

Consumer groups track:

1. Last-delivered ID: the ID of the last entry delivered to any consumer in the group
2. Pending Entries List (PEL): a per-consumer list of delivered-but-unacknowledged entries

The PEL is stored as a dictionary mapping entry IDs to delivery metadata (delivery time, delivery count, consumer name). PEL entries are small but accumulate if consumers fail to acknowledge.

```bash
# Check PEL size
redis-cli XPENDING mystream mygroup - + 100
```

```text
1) 1) "1711900000000-0"
   2) "consumer-1"
   3) (integer) 60000    # ms since last delivery
   4) (integer) 1        # delivery count
```

## Memory Encoding

Inspect stream memory usage:

```bash
redis-cli OBJECT ENCODING mystream
# "stream"

redis-cli MEMORY USAGE mystream
# (integer) 1234567 bytes

redis-cli DEBUG OBJECT mystream
# encoding:stream serializedlength:... lru:... lru_seconds_idle:...
```

## XINFO STREAM - Full Internal View

```bash
redis-cli XINFO STREAM mystream FULL
```

Returns a detailed view including:

- `length`: Number of entries
- `radix-tree-keys`: Number of keys in the radix tree (each key maps to a listpack node)
- `radix-tree-nodes`: Number of internal nodes in the radix tree data structure
- `last-generated-id`: Highest ID ever added
- `entries-added`: Total historical inserts (not trimmed)
- `groups`: Consumer group state including PEL per consumer

```bash
redis-cli XINFO STREAM mystream
```

```text
 1) "length"
 2) (integer) 10000
 3) "radix-tree-keys"
 4) (integer) 102
 5) "radix-tree-nodes"
 6) (integer) 204
 7) "last-generated-id"
 8) "1711900050000-0"
```

## XLEN vs COUNT

```bash
# Returns the number of entries in the stream (O(1))
XLEN mystream

# Read entries with a count limit
XRANGE mystream - + COUNT 100
```

`XLEN` is O(1) because Redis maintains a counter in the stream metadata. It does not traverse the radix tree.

## Trimming and Memory Management

```bash
# Trim to approximately last 1000 entries (fast - approximate)
XTRIM mystream MAXLEN ~ 1000

# Trim to exact count (slower - may traverse tree)
XTRIM mystream MAXLEN 1000

# Trim by minimum ID
XTRIM mystream MINID ~ 1711900000000-0
```

Approximate trimming (`~`) is much faster because Redis can trim entire radix tree nodes without traversing individual entries.

## Summary

Redis Streams store data in a radix tree with listpack leaf nodes, balancing memory efficiency with read performance. Entry IDs guarantee monotonic ordering using millisecond timestamps with a sequence counter. Consumer groups maintain a per-consumer Pending Entries List (PEL) for delivery tracking. Use `XINFO STREAM FULL` to inspect internal state, and prefer approximate trimming (`MAXLEN ~`) for better performance when managing stream size.
