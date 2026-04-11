# How to Estimate Redis Memory for Streams Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Capacity Planning, Stream, DevOps

Description: Learn how to estimate Redis memory for stream workloads by understanding macro-node structure, per-entry overhead, and how MAXLEN trimming affects memory consumption.

---

Redis Streams, introduced in Redis 5.0, are one of the most memory-efficient data structures for time-series and event log workloads. Understanding their internal structure helps you accurately predict memory requirements and configure MAXLEN for cost control.

## How Redis Streams Store Data

Streams use a radix tree of listpack nodes (macro-nodes). Multiple stream entries are packed into each listpack node, sharing common prefix bytes in IDs to save space.

```text
Stream structure:
  - Radix tree metadata:    ~64 bytes per stream
  - Per listpack macro-node: ~32 bytes node overhead
  - Per entry in listpack:   ~12 bytes entry overhead + field_count * (field_size + value_size)
  - Default entries per node: 100 (stream-node-max-entries)
```

## Memory Per Stream Entry

```bash
redis-cli CONFIG GET stream-node-max-entries
# stream-node-max-entries: 100
```

Approximate memory per entry:

```text
Small entries (2 fields, 10 bytes each):
  = 12 + 2 * (10 + 10) = 52 bytes per entry
  Macro-node overhead amortized: 32 / 100 = 0.32 bytes/entry
  Effective cost: ~52-55 bytes per entry

Large entries (10 fields, 50 bytes each):
  = 12 + 10 * (50 + 50) = 1012 bytes per entry
```

## Practical Measurement

```bash
# Add 1000 entries to a stream
for i in $(seq 1 1000); do
  redis-cli XADD events '*' action "click" user_id "user_${i}" page "/home"
done

redis-cli MEMORY USAGE events
redis-cli XLEN events
# Divide to get per-entry cost
```

## Memory Estimation Script

```python
def estimate_stream_memory(
    num_streams: int,
    entries_per_stream: int,
    num_fields: int,
    avg_field_name_bytes: int,
    avg_field_value_bytes: int,
    node_max_entries: int = 100,
    num_consumer_groups: int = 0
) -> dict:
    import math

    base_overhead = 64  # radix tree
    node_overhead = 32
    entry_overhead = 12

    num_nodes = math.ceil(entries_per_stream / node_max_entries)
    entry_data_bytes = num_fields * (avg_field_name_bytes + avg_field_value_bytes)
    per_entry_bytes = entry_overhead + entry_data_bytes

    per_stream = (
        base_overhead
        + num_nodes * node_overhead
        + entries_per_stream * per_entry_bytes
        + num_consumer_groups * 200  # consumer group overhead
    )

    total_mb = (per_stream * num_streams) / 1024 / 1024

    return {
        "bytes_per_entry": per_entry_bytes,
        "bytes_per_stream": per_stream,
        "total_mb": round(total_mb, 1),
        "total_gb": round(total_mb / 1024, 3),
    }

# 1000 event streams, 10,000 entries each, 4 fields (10-byte names, 15-byte values)
result = estimate_stream_memory(
    num_streams=1_000,
    entries_per_stream=10_000,
    num_fields=4,
    avg_field_name_bytes=10,
    avg_field_value_bytes=15,
    num_consumer_groups=2
)
print(result)
# {'bytes_per_entry': 112, 'bytes_per_stream': 1123664, 'total_mb': 1071.6, 'total_gb': 1.046}
```

## Controlling Memory with MAXLEN

Always cap stream length in production to prevent unbounded memory growth:

```bash
# Add entry and trim to last 10,000 entries
redis-cli XADD events MAXLEN ~ 10000 '*' action "click" user_id "abc"

# Trim an existing stream
redis-cli XTRIM events MAXLEN ~ 50000
```

The `~` (approximate trimming) is faster and uses less CPU than exact trimming, keeping the stream within roughly the target length.

## Comparing Streams vs Lists for Queues

For the same 10,000 entries of 100 bytes each:

```text
List:   ~1,120,000 bytes (~1.1 MB)
Stream: ~1,120,000 bytes (~1.1 MB, similar for simple payloads)
```

Streams have slight overhead from consumer group tracking but add replay, fan-out, and consumer group features that lists lack.

## Summary

Redis stream memory is approximately 12 bytes entry overhead plus field data, amortized over 100-entry macro-nodes. For workloads with many small events, streams are highly memory-efficient. Always configure MAXLEN to prevent unbounded growth, and use approximate trimming (`~`) for production performance. Validate your estimates with `MEMORY USAGE` on a sample stream loaded with representative data.
