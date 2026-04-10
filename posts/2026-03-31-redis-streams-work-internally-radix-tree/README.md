# How Redis Streams Work Internally (Radix Tree)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Radix Tree, Internal, Performance

Description: Explore how Redis streams use a radix tree of listpack nodes to store time-ordered entries efficiently, enabling scalable event log storage with compact memory.

---

Redis streams provide an append-only log with consumer groups and time-based IDs. Internally they use a `radix tree` whose leaf nodes are `listpack`-encoded macro-nodes, giving excellent memory efficiency while supporting fast range queries by stream ID.

## Stream ID Structure

Every stream entry has an ID in the format `<milliseconds>-<sequence>`:

```bash
XADD events "*" action "login" user "alice"
# Returns something like: "1711880000000-0"

XADD events "*" action "purchase" user "bob"
# Returns: "1711880000000-1"  (same ms, incremented seq)
```

The full stream ID (milliseconds + sequence) is encoded as a 128-bit big-endian key in the radix tree. Because IDs close in time share a common prefix, the radix tree compresses them efficiently. Consecutive entries are packed into the same listpack node until the configured size or entry-count limit is reached.

## Radix Tree of Listpack Nodes

```text
Radix tree (key = stream ID of first entry in node):
  [1711880000000-0] -> listpack:
                         entry[0]: 1711880000000-0, {action:login, user:alice}
                         entry[1]: 1711880000000-1, {action:purchase, user:bob}
                         entry[2]: 1711880001000-0, {action:logout, user:alice}
```

Each listpack macro-node stores a batch of consecutive entries, keyed by the ID of the first entry in the node. A new node is created when the current one exceeds `stream-node-max-bytes` or `stream-node-max-entries`. This dramatically reduces per-entry overhead compared to storing each entry as a separate node.

## Checking Stream Internals

```bash
XADD events "*" action "login" user "alice"
XADD events "*" action "purchase" user "bob"
XINFO STREAM events
# Shows: length, radix-tree-keys, radix-tree-nodes, last-generated-id
```

```bash
XINFO STREAM events FULL
# Shows full consumer group state and PEL
```

## Listpack Node Packing

```bash
# Control how many entries Redis packs into one listpack node
CONFIG GET stream-node-max-bytes
# Default: 4096 (bytes per listpack node)

CONFIG GET stream-node-max-entries
# Default: 100 (entries per listpack node)
```

When a listpack node exceeds either limit, Redis creates a new node in the radix tree. Increasing these values improves memory efficiency at the cost of slower entry-level access within a node.

## Memory Efficiency in Practice

```python
import redis

r = redis.Redis()

# Add 1000 stream entries
for i in range(1000):
    r.xadd("telemetry", {"sensor_id": f"s{i % 10}", "value": str(i * 0.5)})

info = r.xinfo_stream("telemetry")
print("Stream length:", info["length"])
print("Radix tree keys:", info["radix-tree-keys"])
print("Radix tree nodes:", info["radix-tree-nodes"])
print("Memory:", r.memory_usage("telemetry"), "bytes")
```

## Comparison with Alternatives

| Approach | Memory per entry | Range query | Consumer groups |
|----------|-----------------|-------------|-----------------|
| Redis Stream | ~50-100 bytes | O(log N) | Native |
| Redis List | ~100-200 bytes | O(S+N) | Manual |
| Redis Sorted Set | ~150-300 bytes | O(log N) | Manual |

## XTRIM and Radix Tree Pruning

When you trim a stream, Redis removes entire listpack macro-nodes from the radix tree:

```bash
# Keep only the last 500 entries
XTRIM events MAXLEN 500

# Approximate trimming (faster, removes whole nodes)
XTRIM events MAXLEN ~ 500
```

The `~` operator allows Redis to trim at macro-node boundaries, which is much faster than precise trimming.

## Summary

Redis streams use a radix tree whose leaves are listpack macro-nodes, packing consecutive entries into compact blocks. Because stream IDs are stored as 128-bit big-endian keys, entries close in time share radix tree prefixes, enabling O(log n) range queries by stream ID while keeping per-entry memory overhead low. Tune `stream-node-max-bytes` and `stream-node-max-entries` to control the granularity of packing for your workload.
