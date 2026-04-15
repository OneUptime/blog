# How to Plan for ClickHouse Network Bandwidth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Network, Capacity Planning, Infrastructure, Performance

Description: Estimate ClickHouse network bandwidth needs for ingestion, replication, distributed queries, and backup traffic to avoid network saturation.

---

Network bandwidth is a hidden bottleneck in ClickHouse clusters. Four traffic types compete for bandwidth: ingestion, inter-replica replication, distributed query shuffle, and backup uploads.

## Traffic Categories

| Traffic Type | Direction | Notes |
|---|---|---|
| Ingestion | Client to node | Compressed in transit if using native protocol |
| Replication | Node to node | Uses compressed part files |
| Distributed query | Node to node | Result rows sent to initiator |
| Backup | Node to object storage | Compressed parts |

## Estimating Ingestion Bandwidth

```text
Ingestion rate: 100,000 rows/sec
Average row size (uncompressed): 500 bytes
Native protocol compression ~3x before network
Network ingestion bandwidth: (100,000 * 500) / 3 = ~17 MB/sec per ingest node
```

## Estimating Replication Bandwidth

Replication transfers compressed parts. For 2 replicas:

```text
Compressed write rate: 100,000 rows/sec / 8x compression * 500 bytes = 6.25 MB/sec
Each write goes to 1 other replica: 6.25 MB/sec replication traffic
```

## Distributed Query Shuffle

Worst case: full table scan with `GROUP BY` on a non-shard key. Intermediate aggregation on each shard reduces the shuffle:

```sql
-- Set this to reduce shuffle size
SET max_bytes_before_external_group_by = 5000000000;
SET distributed_aggregation_memory_efficient = 1;
```

## Backup Bandwidth

Plan backup windows to avoid peak hours. Throttle backup uploads:

```bash
clickhouse-backup create my_backup
# Throttle upload bandwidth via AWS CLI S3 max_bandwidth config
aws configure set default.s3.max_bandwidth 50MB/s
aws s3 cp parts/ s3://bucket/ --recursive
```

## Network Interface Sizing

```text
Total peak bandwidth = ingestion + replication + query_shuffle + OS overhead
= 17 + 6.25 + 10 (estimated) + 5 = ~38 MB/sec
```

A 1 Gbps (125 MB/sec) NIC provides 3x headroom - adequate for this workload. For higher rates, use 10 Gbps NICs and verify with `iftop` or `nethogs`.

## Monitoring

Track network TX/RX per node with [OneUptime](https://oneuptime.com). Alert when sustained utilization exceeds 70% of interface capacity.

## Summary

Plan ClickHouse network bandwidth by summing ingestion, replication, and query shuffle traffic. Use the native protocol for compressed ingestion, enable distributed aggregation memory efficiency, and schedule backups during off-peak hours.
