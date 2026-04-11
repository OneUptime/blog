# How to Estimate Redis Hardware Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Infrastructure, Performance

Description: Learn how to estimate Redis hardware requirements including RAM, CPU, disk, and network specs based on your dataset size, throughput, and persistence needs.

---

Choosing the right hardware for Redis prevents performance bottlenecks and unnecessary costs. This guide provides concrete formulas and benchmarks for estimating RAM, CPU, disk, and network requirements.

## RAM Requirements

RAM is the most critical resource for Redis. Use this formula:

```text
RAM = (avg_key_size + avg_value_size + 64 bytes overhead) x num_keys x 1.3 (fragmentation factor)
```

Practical example:

```bash
# Check current fragmentation ratio
redis-cli INFO memory | grep mem_fragmentation_ratio

# Calculate dataset size
redis-cli INFO memory | grep -E "used_memory:|used_memory_rss:"
```

```text
Dataset: 5 million keys
Avg entry: 512 bytes
Base memory: 5M x (512 + 64) = 2.88 GB
Fragmentation (1.3x): 3.74 GB
Fork overhead (for RDB/AOF): +3.74 GB
Total recommended RAM: 8 GB
```

## CPU Requirements

Redis is primarily single-threaded per shard:

```bash
# Check CPU usage
redis-cli INFO cpu
redis-cli INFO stats | grep total_commands_processed
```

```text
Simple commands (GET, SET): 1 vCPU per 100,000 ops/sec
Complex commands (SORT, SCAN): 1 vCPU per 20,000 ops/sec
Background processes (AOF rewrite, RDB save): +1-2 vCPUs

Recommended minimum: 4 vCPUs for production
```

## Disk Requirements

Disk is needed for persistence files:

```bash
# RDB file size
ls -lh /var/lib/redis/dump.rdb

# AOF file size
ls -lh /var/lib/redis/appendonly.aof
```

```text
RDB: ~50-60% of in-memory dataset size
AOF: 1x-3x dataset size (before compaction)
AOF after rewrite: ~60% of dataset size

For 4 GB dataset:
  RDB: ~2.4 GB
  AOF: ~8 GB peak during rewrite
  Recommended disk: 20 GB SSD minimum
```

Use fast SSD storage for AOF:

```text
SATA SSD: 500 MB/s - adequate for most workloads
NVMe SSD: 3 GB/s - recommended for high-throughput AOF
HDD: Not recommended for AOF (high latency on fsync)
```

## Network Requirements

```bash
# Monitor current throughput
redis-cli INFO stats | grep -E "total_net_input_bytes|total_net_output_bytes"
```

```text
Throughput calculation:
  10,000 ops/sec x 1 KB avg payload = 80 Mbps
  Peak factor (3x): 240 Mbps

Recommended NIC: 1 Gbps for most deployments
                 10 Gbps for high-throughput clusters
```

## Hardware Sizing Reference Table

```text
Workload   | RAM   | vCPU | Disk   | Network
-----------|-------|------|--------|--------
Small      | 4 GB  | 2    | 20 GB  | 1 Gbps
Medium     | 16 GB | 4    | 80 GB  | 1 Gbps
Large      | 64 GB | 8    | 320 GB | 10 Gbps
Very Large | 256 GB| 16   | 1 TB   | 10 Gbps
```

## Cloud Instance Recommendations

```text
AWS:
  Small:  cache.t3.medium  (3.09 GB RAM)
  Medium: cache.r6g.large  (13.07 GB RAM)
  Large:  cache.r6g.2xlarge (52.82 GB RAM)

GCP (Memorystore for Redis):
  Small:  Basic tier, 4 GB
  Medium: Standard tier, 13 GB
  Large:  Standard tier, 26 GB
```

## Benchmarking Your Workload

```bash
# Simulate your specific workload
redis-benchmark -h 127.0.0.1 -p 6379 \
  -n 1000000 \
  -c 100 \
  -d 512 \
  --csv \
  -t set,get,hset,lpush
```

## Summary

Redis hardware sizing starts with RAM (dataset + fragmentation + fork overhead), adds CPU based on ops/sec, plans disk for persistence files (preferably NVMe SSD), and ensures network bandwidth covers peak throughput. Always add 30-50% headroom and benchmark with realistic payloads before finalizing your instance type.
