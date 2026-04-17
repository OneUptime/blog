# How to Estimate ClickHouse Cluster Size for Your Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Capacity Planning, Cluster, Performance, Infrastructure

Description: Estimate the right number of ClickHouse nodes, shards, and replicas for your ingestion rate, data volume, and query concurrency requirements.

---

Cluster sizing starts with three inputs: ingestion rate (rows/sec), data retention (days), and query concurrency (simultaneous queries). From these you derive storage, memory, and CPU requirements.

## Step 1 - Estimate Compressed Data Size

ClickHouse typically achieves 5-10x compression on time-series and log data. Start with raw size and divide:

```text
Raw row size: 500 bytes
Ingestion rate: 100,000 rows/sec
Daily raw data: 100,000 * 86,400 * 500 = 4.32 TB/day
Compressed (8x): 540 GB/day
Retention: 30 days
Total storage needed: 16.2 TB
```

Add 30% headroom: ~21 TB usable storage required.

## Step 2 - Estimate Memory per Node

ClickHouse uses memory for:
- Query processing buffers (rule of thumb: 1 GB per concurrent query)
- Marks cache (fixed allocation; `mark_cache_size` defaults to 5 GB, often raised to 10-20 GB on large clusters)
- OS page cache for hot data (typically 20-50% of node RAM)

```text
Max concurrent queries: 20
Query buffers: 20 * 1 GB = 20 GB
Marks cache: ~10 GB per node
OS page cache for hot data: ~30 GB
Per-node memory: ~60 GB
```

Choose 64 GB or 128 GB nodes.

## Step 3 - CPU Sizing

ClickHouse is CPU-bound for aggregation queries. As a rough planning heuristic, allocate 1 CPU core per 100 MB/s of uncompressed data scanned during aggregations (a single core can process roughly 100-500 MB/s of compressed data depending on query complexity):

```text
Peak query load: 10 concurrent queries, each scanning 1 GB/sec = 10 GB/sec total
CPU cores needed: 10,000 MB/s / 100 MB/s per core = ~100 cores
Round up for parallelism and headroom: ~128 cores
```

Use 32-core nodes and start with 4 nodes.

## Step 4 - Shard and Replica Count

```text
Replicas: 2 per shard (HA minimum), 3 for better read throughput
Shards: total_storage / per_node_disk
       = 21 TB / 5 TB = ~5 shards
Total nodes: shards * replicas = 5 * 2 = 10 nodes
```

Each replica in a shard holds a full copy of that shard's data, so the replication factor multiplies total hardware but does not reduce per-shard storage. Start with 5 shards, 2 replicas = 10 nodes. Add shards as data grows.

## Quick Sizing Reference

```text
Small  (< 1 TB/day):  2 shards, 2 replicas, 4 nodes, 32 GB RAM each
Medium (1-10 TB/day): 4 shards, 2 replicas, 8 nodes, 64 GB RAM each
Large  (> 10 TB/day): 8+ shards, 2-3 replicas, 16+ nodes, 128 GB RAM each
```

## Summary

Cluster sizing in ClickHouse follows a straightforward formula: estimate compressed storage, work backward to memory and CPU, then choose shard and replica counts. Always benchmark with a representative workload before finalizing the production cluster.
