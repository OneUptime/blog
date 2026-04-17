# ClickHouse Cost Optimization Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cost Optimization, Storage, Checklist, Compression

Description: A cost optimization checklist for ClickHouse covering storage compression, data tiering, TTL policies, and compute efficiency to reduce infrastructure spend.

---

ClickHouse's main infrastructure costs are compute (CPU/RAM) and storage. This checklist identifies the highest-impact optimizations for reducing cost without sacrificing query performance.

## Storage Compression

```text
[ ] ZSTD(3) codec applied to cold/archive tables (typically 20-50% better compression ratio than LZ4)
[ ] Delta codec applied to monotonically increasing columns before ZSTD
[ ] Gorilla codec applied to float sensor/metric columns
[ ] Column types are smallest possible (UInt8 instead of UInt64 where applicable)
[ ] LowCardinality applied to low-cardinality string columns
```

```sql
-- Check current compression ratios by table
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 1) AS compression_ratio
FROM system.columns
GROUP BY table
ORDER BY sum(data_compressed_bytes) DESC;
```

## TTL and Data Expiry

```text
[ ] TTL defined for all time-series tables (delete data older than N days)
[ ] TTL MOVE TO DISK configured for tiered storage (hot/warm/cold)
[ ] Verify TTL jobs are running (check system.parts for old partitions)
```

```sql
-- Add TTL to move old data to cheaper storage after 30 days
ALTER TABLE events
MODIFY TTL
    event_time + INTERVAL 30 DAY TO DISK 'cold_s3',
    event_time + INTERVAL 180 DAY DELETE;
```

## Data Tiering

```text
[ ] Hot data (last 7-30 days) on local NVMe SSD
[ ] Warm data (30-180 days) on S3-compatible object storage
[ ] Cold data (180+ days) archived or deleted via TTL
[ ] Storage policies defined in config.xml
```

## Query Efficiency (Compute Cost)

```text
[ ] Materialized views pre-aggregating top dashboard queries
[ ] Query result cache enabled for repeated identical queries
[ ] uniq() used instead of uniqExact() for approximate analytics
[ ] Sampling (SAMPLE 0.01) for approximate queries on huge tables
[ ] No SELECT * patterns in production queries
```

```sql
-- Identify queries reading unnecessarily large data volumes
SELECT
    any(query) AS sample_query,
    avg(read_bytes) AS avg_bytes_read,
    count() AS calls
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 DAY
GROUP BY normalized_query_hash
ORDER BY avg_bytes_read * calls DESC
LIMIT 10;
```

## Cluster Sizing

```text
[ ] CPU utilization measured during peak load (target 60-70% to leave headroom)
[ ] Memory utilization measured during peak load (target <80%)
[ ] Nodes not idle during off-peak hours (consider ClickHouse Cloud auto-scaling)
[ ] Replica count set to minimum required for HA (2 replicas is usually sufficient)
```

## S3 Request Cost Optimization

```text
[ ] Filesystem cache sized appropriately to reduce S3 GET requests
[ ] Part sizes tuned to minimize S3 HEAD and LIST operations
[ ] Tiered storage lifecycle rules prevent reading deleted data
```

## Summary

The highest-impact cost optimizations in ClickHouse are better compression codecs (ZSTD over LZ4 for cold data), TTL-based data expiry and tiering to cheaper storage, and materialized views that reduce CPU cost for repeated queries. Run the storage compression query monthly to identify tables that could benefit from codec changes.
