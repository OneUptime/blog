# How Redis Quicklist Data Structure Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Quicklist, List, Internal, Data Structure, Memory

Description: Understand Redis quicklist - the doubly linked list of listpack nodes used for List encoding, and how it balances memory efficiency with O(1) head/tail operations.

---

## What Is Quicklist

Quicklist is the data structure Redis uses for List values when the list encoding is not a single small listpack. It is a doubly linked list where each node contains a listpack (compact array) of multiple elements.

Quicklist was introduced in Redis 3.2 to replace the old `ziplist + linkedlist` dual-encoding approach, offering a single encoding that is both memory-efficient and operationally fast.

## Architecture

```text
Quicklist (doubly linked list of listpack nodes):

HEAD <-> [lp_node1: [a,b,c,d]] <-> [lp_node2: [e,f,g,h]] <-> [lp_node3: [i,j,k]] <-> TAIL

Each lp_node:
- listpack: compact array of elements
- prev: pointer to previous node
- next: pointer to next node
- count: number of elements in this node
- recompress: flag for LZF compression
```

## Key Operations and Complexity

```text
LPUSH / RPUSH:  O(1) - add to head/tail listpack node
LPOP / RPOP:    O(1) - remove from head/tail listpack node
LINDEX:         O(N) - traverse to find element at index
LINSERT:        O(N) - find position then insert
LRANGE:         O(S+N) - skip S elements, return N
LLEN:           O(1) - stored in quicklist struct
```

## Configuration

```bash
# Maximum elements per listpack node
# Positive: max number of entries per node
# Negative: max size in bytes per node:
#   -1 = 4kb, -2 = 8kb (default), -3 = 16kb, -4 = 32kb, -5 = 64kb
redis-cli CONFIG GET list-max-listpack-size
# -2 (8kb per node)

# Number of listpack nodes to compress (0 = no compression)
# list-compress-depth 0: no compression
# list-compress-depth 1: compress all nodes except head and tail
# list-compress-depth 2: compress all except 2 nodes from each end
redis-cli CONFIG GET list-compress-depth
# 0 (no compression by default)
```

## Observing Quicklist Structure

```bash
# Create a list with enough elements to exceed a single listpack node
redis-cli RPUSH mylist $(seq 1 1000 | tr '\n' ' ')
redis-cli OBJECT ENCODING mylist
# quicklist

# Get detailed debug info
redis-cli DEBUG OBJECT mylist
# Value at:0x7fa... refcount:1 encoding:quicklist serializedlength:...
# lru:... type:list
# ql_nodes:2 ql_avg_node:500.00 ql_ziplist_max:-2 ql_compressed:0 ql_uncompressed:2
```

## Quicklist Node Splitting

When a listpack node reaches its maximum size, Redis creates a new node for the incoming element:

```text
Before (tail node full):
[a, b, c, d, e, f, g, h, i, j]  <- node at max capacity

After RPUSH x:
[a, b, c, d, e, f, g, h, i, j]  [x]  <- new node created for x
```

This keeps individual node operations fast (O(1) for head/tail) while maintaining bounded node size.

## LZF Compression for Middle Nodes

For lists used as queues where only head/tail are accessed, middle nodes can be compressed:

```bash
# Enable compression for middle nodes
redis-cli CONFIG SET list-compress-depth 1

# Node structure with compression depth 1:
# [HEAD_node] <-> [compressed_node] <-> [compressed_node] <-> [TAIL_node]
# Only HEAD and TAIL nodes are kept uncompressed for O(1) access
```

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

// Configure a list for queue workload (head/tail access only)
await redis.config('SET', 'list-compress-depth', '2');
await redis.config('SET', 'list-max-listpack-size', '-2');

// Queue operations - always O(1) despite compression
await redis.rpush('job-queue', JSON.stringify({ id: 1, type: 'email' }));
const job = await redis.lpop('job-queue');
```

## Memory Comparison

```bash
# List with 1000 elements - 3 different configurations
redis-cli RPUSH list-small $(python3 -c "print(' '.join(['x'] * 1000))")

# Default (-2 = 8kb nodes):
redis-cli MEMORY USAGE list-small
# ~20kb

# With compression (depth 1):
redis-cli CONFIG SET list-compress-depth 1
# Re-create the list
# ~12kb (40% reduction for long lists)
```

## Internal Node Recompression

Redis transparently decompresses nodes when accessed and recompresses when done:

```text
Access middle node for LINDEX:
1. Decompress node in place
2. Read the element
3. Recompress the node
4. Return the element

This is transparent to the user but adds CPU overhead
for LINDEX on lists with compression enabled.
```

## Quicklist vs Old Encoding

Before Redis 3.2:
```text
Small list (<= 512 elements):   ziplist encoding
Large list (> 512 elements):    linkedlist encoding (one malloc per element)
```

With quicklist (Redis 3.2+):
```text
All lists:                      quicklist (single encoding)
```

Benefits:
- No encoding conversion overhead as lists grow
- Memory-efficient even for large lists (listpack nodes)
- Predictable performance characteristics

## Verifying Configuration Is Applied

```javascript
const Redis = require('ioredis');
const r = new Redis({ host: 'localhost' });

async function inspectList(key) {
  const [encoding, len, debug] = await Promise.all([
    r.object('ENCODING', key),
    r.llen(key),
    r.call('DEBUG', 'OBJECT', key),
  ]);

  console.log({ encoding, length: len, debug });
}

await r.rpush('test-list', ...Array.from({ length: 50 }, (_, i) => `item${i}`));
await inspectList('test-list');
```

## Summary

Redis quicklist combines the memory efficiency of listpack with the O(1) head/tail operations of a doubly linked list by organizing elements into bounded-size listpack nodes. Configure `list-max-listpack-size` to control node size and `list-compress-depth` to compress middle nodes for queue-style access patterns that only touch the head and tail. For most workloads, the default `-2` (8kb nodes, no compression) provides an excellent balance.
