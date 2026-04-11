# How to Configure list-max-listpack-size for Memory Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, List, Memory, Listpack

Description: Configure list-max-listpack-size and list-max-ziplist-size in Redis to control quicklist node size and optimize memory usage for your list workload.

---

Redis lists use `quicklist` encoding - a linked list of listpack (formerly ziplist) nodes. The `list-max-listpack-size` setting controls how large each node can grow before a new node is allocated.

## How Quicklist Works

A quicklist is a doubly-linked list where each node holds a listpack:

```text
quicklist
  |
  node1 [a, b, c, d]  <->  node2 [e, f, g, h]  <->  node3 [i, j]
```

Each listpack node is a compact, contiguous memory array. Larger nodes mean fewer allocations but slower middle-of-list access; smaller nodes give faster access but more overhead.

## The Configuration Setting

```bash
redis-cli CONFIG GET list-max-listpack-size
# (or the older alias list-max-ziplist-size)
```

The setting accepts:
- Positive integer: max number of elements per node
- Negative integer: max size in bytes per node

```text
Value   Meaning
-1      Max 4 KB per node
-2      Max 8 KB per node (safe default)
-3      Max 16 KB per node
-4      Max 32 KB per node
-5      Max 64 KB per node
 128    Max 128 elements per node (positive = element count)
```

The default is `-2` (max 8 KB per node).

## When to Adjust

For small elements (< 64 bytes), element count matters more:

```bash
# Default (-2 = 8 KB per node): good for mixed workloads
redis-cli CONFIG SET list-max-listpack-size -2

# For many small elements (e.g., UUIDs or short strings):
redis-cli CONFIG SET list-max-listpack-size 128

# For large elements (e.g., JSON blobs):
redis-cli CONFIG SET list-max-listpack-size -3  # 16 KB per node
```

In `redis.conf`:

```text
list-max-listpack-size -2
```

## Memory Impact Comparison

```python
import redis

r = redis.Redis()

def test_list_memory(n_elements, element_size, config_size):
    r.config_set("list-max-listpack-size", config_size)
    r.delete("test_list")

    value = "x" * element_size
    pipe = r.pipeline(transaction=False)
    for _ in range(n_elements):
        pipe.rpush("test_list", value)
    pipe.execute()

    mem = r.memory_usage("test_list")
    per_elem = mem / n_elements
    print(
        f"Config: {config_size:5}  Elements: {n_elements:5}  "
        f"Element size: {element_size:4}  "
        f"Total: {mem:7} bytes  Per elem: {per_elem:.1f}"
    )

# Compare configurations
test_list_memory(1000, 20, "-2")    # default 8KB nodes
test_list_memory(1000, 20, "128")   # 128 elements per node
test_list_memory(1000, 20, "-1")    # 4KB nodes
```

## list-compress-depth for Long Lists

For lists that are mostly accessed at the head and tail (common for queues), enable compression of middle nodes:

```bash
redis-cli CONFIG SET list-compress-depth 1
```

```text
Value   Effect
0       No compression (default)
1       Compress all nodes except first and last
2       Compress all nodes except first 2 and last 2
3       Compress all nodes except first 3 and last 3
```

Combined with listpack-size:

```bash
# Optimal for FIFO queues with large payloads
redis-cli CONFIG SET list-max-listpack-size -2
redis-cli CONFIG SET list-compress-depth 1
```

Compression uses LZF and reduces memory by 30-50% for compressible data with negligible CPU cost for head/tail operations.

## Checking Current Encoding

```bash
OBJECT ENCODING mylist
# Always "quicklist" for standard lists
# "listpack" for very short lists (Redis 7.2+, under list-max-listpack-size threshold)
```

Redis 7.2 introduced a small-list optimization: lists with few elements use a pure listpack (not quicklist). The `list-max-listpack-size` setting controls when this pure listpack is used vs. quicklist.

## Practical Recommendations

```text
Use case                           Recommendation
FIFO queue, large payloads         -2 (default) + compress-depth 1
FIFO queue, tiny payloads          128 (count-based, more elements/node)
Random access patterns             -1 (smaller nodes = faster iteration)
Capped lists (LTRIM)               -2 (default, balanced)
```

## Summary

`list-max-listpack-size` controls quicklist node sizing in Redis lists. The default of `-2` (8 KB per node) works well for most workloads. Use a positive value like `128` for very small elements to pack more into each node, and enable `list-compress-depth 1` for queue-style lists to compress middle nodes and cut memory usage by up to 50%.
