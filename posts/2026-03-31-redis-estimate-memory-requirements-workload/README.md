# How to Estimate Redis Memory Requirements for Your Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Capacity Planning, Operation

Description: Estimate Redis memory requirements before deployment using per-key overhead formulas, encoding awareness, and replication multipliers for accurate capacity planning.

---

Sizing a Redis instance accurately prevents out-of-memory crashes and wasted over-provisioning. This guide provides a framework for estimating Redis memory requirements before you deploy.

## Components of Redis Memory Usage

Total Redis memory = data memory + overhead:

```text
Total = (key_count x avg_key_size)
      + (key_count x avg_value_size)
      + (key_count x per_key_overhead)    # ~60-90 bytes
      + dict_overhead                      # ~2 keys per bucket
      + server_overhead                    # ~2-5 MB baseline
      + replication_buffer                 # if replicas exist
```

## Per-Key Overhead

Redis maintains an internal dictionary with each key. Base overhead per key:

```text
Object header:     16 bytes
Key SDS string:    ~40 bytes + key length
Dict entry:        ~24 bytes
jemalloc padding:  ~8-16 bytes
----------------------------------
Total base:        ~88 bytes minimum
```

For short keys (< 10 chars), the overhead often exceeds the data itself.

## Workload Estimation Template

```python
def estimate_redis_memory(
    key_count,
    avg_key_length_bytes,
    avg_value_length_bytes,
    encoding="raw",
    replica_count=0
):
    PER_KEY_OVERHEAD = 90  # bytes of base overhead per key

    encoding_overhead = {
        "int":       0,
        "embstr":    0,       # key + value co-located
        "raw":       32,      # SDS header + pointer
        "listpack":  16,      # per element in collections
        "hashtable": 64,      # per element in collections
        "skiplist":  96,      # per element in sorted sets
    }

    data_bytes = key_count * (
        avg_key_length_bytes
        + avg_value_length_bytes
        + PER_KEY_OVERHEAD
        + encoding_overhead.get(encoding, 32)
    )

    server_baseline = 5 * 1024 * 1024  # 5 MB
    replication_buffer = 10 * 1024 * 1024 * replica_count  # 10 MB per replica
    total = data_bytes + server_baseline + replication_buffer

    return {
        "data_mb": data_bytes / 1024 / 1024,
        "total_mb": total / 1024 / 1024,
        "recommended_maxmemory_mb": (total / 1024 / 1024) * 1.3,  # 30% headroom
    }

result = estimate_redis_memory(
    key_count=1_000_000,
    avg_key_length_bytes=20,
    avg_value_length_bytes=200,
    encoding="raw",
    replica_count=2
)
print(f"Data: {result['data_mb']:.0f} MB")
print(f"Total: {result['total_mb']:.0f} MB")
print(f"Recommended maxmemory: {result['recommended_maxmemory_mb']:.0f} MB")
```

## Reference: Memory by Data Type and Size

```text
Data type   Entries   Encoding    Bytes/entry
String      1         embstr      ~56 bytes (value <= 44 bytes)
String      1         raw         ~80 bytes (value > 44 bytes)
Hash        < 128     listpack    ~24 bytes/field-value
Hash        > 128     hashtable   ~72 bytes/field-value
List        small     quicklist/listpack  ~16 bytes/element
List        large     quicklist/listpack  ~40 bytes/element
Set (int)   < 512     intset      ~4-8 bytes/element
Set         < 128     listpack    ~24 bytes/element
Set         > 128     hashtable   ~72 bytes/element
ZSet        < 128     listpack    ~36 bytes/element
ZSet        > 128     skiplist    ~112 bytes/element
```

## Accounting for RDB Snapshot Memory

During `BGSAVE`, Redis forks. The child process gets a copy-on-write snapshot of memory. In the worst case (all keys modified during save), RSS briefly doubles:

```python
def estimate_peak_memory_with_rdb(base_mb, write_rate_pct=0.3):
    """
    write_rate_pct: fraction of keys modified during a typical RDB save window
    """
    cow_overhead = base_mb * write_rate_pct
    return base_mb + cow_overhead
```

## Practical Sizing Example

User session store: 500,000 sessions, each a hash of 8 string fields:

```text
Encoding: listpack (8 fields < 128 threshold)
Memory per session: 8 fields x 24 bytes = 192 bytes
Plus key overhead: 90 bytes
Per session total: ~282 bytes

500,000 sessions x 282 bytes = 141 MB
Server overhead: 5 MB
Total: ~146 MB

With 30% headroom: set maxmemory 190m
With 2 replicas: add 20 MB for replication buffers
Final recommendation: 210 MB
```

## Validating Estimates in Production

After deployment, compare estimate to actual:

```bash
redis-cli INFO memory | grep -E "used_memory:|mem_fragmentation"
```

If actual is significantly higher, check:
1. `mem_fragmentation_ratio` > 1.5 indicates fragmentation overhead
2. Keys exceeding listpack thresholds (check with `OBJECT ENCODING`)
3. Unexpected large values (use `redis-cli --bigkeys` scan)

## Summary

Accurate Redis memory estimation requires per-key overhead (~90 bytes), encoding-aware value sizing, server baseline, and replication buffer allowance. Add 30% headroom for fragmentation and RDB fork copy-on-write spikes. Validate estimates post-deployment using `INFO memory` and adjust `maxmemory` before eviction pressure appears.
