# Validation Summary: How to Estimate ClickHouse Cluster Size for Your Workload

## Status
validated

## Post Type
Guide / Capacity-planning tutorial

## Technologies Covered
- ClickHouse (cluster sizing, sharding, replication, memory, CPU)
- ReplicatedMergeTree replication model

## Sources Consulted
- ClickHouse Server Settings documentation: https://clickhouse.com/docs/operations/server-configuration-parameters/settings (default `mark_cache_size` = 5 GB)
- ClickHouse Replication Architecture: https://clickhouse.com/docs/en/architecture/replication (each replica holds full copy of shard data)
- ClickHouse blog "How does a database scale any query to 9000+ cores": https://clickhouse.com/blog/clickhouse-group-by-parallel-replicas-8900-cores (per-core throughput benchmarks)
- ClickHouse Database Compression resource: https://clickhouse.com/resources/engineering/database-compression
- ClickHouse blog "Compressing nginx logs 170x with column storage": https://clickhouse.com/blog/log-compression-170x
- ClickHouse simple-logging-benchmark: https://github.com/ClickHouse/simple-logging-benchmark/blob/main/results/compression.md

## Issues Found

1. **Marks cache sized as a percentage of total data (Step 2)** — The post stated marks cache is "usually 10-15% of total data size" and the example calculation then used 1% (0.01). Both are inconsistent and incorrect. In reality `mark_cache_size` is a fixed server-level cap (default 5 GB, sometimes raised to 10-20 GB) and real marks are typically <0.1% of compressed data. A 10-15% figure on a 21 TB dataset would mean 2-3 TB of RAM just for marks, which is nonsensical. Replaced the description and calculation to reflect a fixed allocation (~10 GB per node) plus explicit query-buffer and OS-page-cache lines. Per-node total of ~60 GB is preserved.

2. **Shard count formula divided by replication factor (Step 4)** — The post used `shards = total_storage / (per_node_disk * replication_factor)`, giving 21 TB / (5 TB × 2) = ~3 shards. This is wrong: in `ReplicatedMergeTree`, each replica within a shard holds a full copy of that shard's data, so the replication factor multiplies total hardware but does not reduce per-shard storage requirements. Three shards × 5 TB/node = 15 TB capacity per replica set, which cannot hold 21 TB of data and would cause disk-full failures. Corrected to `shards = total_storage / per_node_disk` = ceil(21/5) = 5 shards, and updated total node count from 6 to 10. Added a clarifying sentence about why replication factor multiplies but does not divide.

3. **CPU sizing rule of thumb ("1 core per 10 MB/s") (Step 3)** — Off by roughly 50-100x. ClickHouse benchmarks show a single core processing ~127M rows/s (~700 MB/s) on GROUP BY, and practical aggregation throughput is 100-500+ MB/s per core. Kept the final recommendation (~128 cores / 4 nodes × 32 cores) since that sizing is reasonable for the workload, but corrected the heuristic to "1 core per 100 MB/s of uncompressed data scanned" and added context on per-core compressed throughput. The revised arithmetic now yields the same ~128 cores cleanly.

## Review Notes

- The 5-10x compression claim is conservative but acceptable; 10-20x is more typical for logs/time-series, and ClickHouse case studies report 15x-170x on log workloads. Left as-is since conservative sizing errs on the safe side.
- The "1 GB per concurrent query" heuristic is a commonly cited planning number; ClickHouse's actual per-query memory is governed by `max_memory_usage` (default 10 GB) and varies widely with GROUP BY cardinality, JOINs, and sorting. Acceptable as a rough planning figure.
- The Quick Sizing Reference table uses categories that do not perfectly align with the 30-day retention scenario in the worked example (a "Small" 0.54 TB/day workload becomes 16 TB of stored data, closer to "Medium" capacity). Left as-is since both serve as independent reference points rather than a strict cross-reference.
- The corrected CPU-based sizing (4 nodes) and the storage-based sizing (10 nodes in Step 4) can legitimately differ; in practice operators take the larger of the two. The post does not call this out explicitly, but this is acceptable for a back-of-envelope guide.
