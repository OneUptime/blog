# Validation Summary: How to Use ClickHouse for Prometheus Metrics Long-Term Retention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, TTL, tiered storage, materialized views, AggregatingMergeTree)
- Prometheus (remote_write configuration, TSDB retention)
- VictoriaMetrics (mentioned as alternative remote write adapter)
- S3 (tiered cold storage backend)

## Sources Consulted
- ClickHouse documentation on MergeTree ORDER BY key constraints: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on Map data type: https://clickhouse.com/docs/en/sql-reference/data-types/map
- ClickHouse documentation on TTL for tiered storage: https://clickhouse.com/docs/en/guides/developer/ttl
- ClickHouse documentation on partitioning best practices: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key
- Prometheus documentation on remote_write configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write
- Prometheus documentation on storage and retention: https://prometheus.io/docs/prometheus/latest/storage/

## Issues Found

### 1. Map type used in ORDER BY (first schema) — Fixed
- **What was wrong:** The first schema used `ORDER BY (metric_name, labels, timestamp)` where `labels` is a `Map(LowCardinality(String), String)`. ClickHouse does not support Map types as ORDER BY keys in MergeTree tables because Map is not a comparable type. This would cause a table creation error.
- **What was changed:** Changed to `ORDER BY (metric_name, timestamp)`, removing the Map column from the key.
- **Why:** MergeTree ORDER BY keys must use types that support comparison operations for sorting. Map is a complex container type that does not satisfy this requirement.

### 2. Excessive partitioning strategy (first schema) — Fixed
- **What was wrong:** The first schema used `PARTITION BY (date, metric_name)`, which creates one partition per unique (date, metric_name) pair. With thousands of distinct metric names, this generates thousands of partitions per day, quickly exceeding ClickHouse's recommended partition limits and triggering "too many parts" errors.
- **What was changed:** Changed to `PARTITION BY toYYYYMM(date)` for monthly partitioning, which is the standard practice for time-series data in ClickHouse.
- **Why:** ClickHouse documentation recommends keeping the total number of partitions manageable (typically under a few thousand). Monthly partitioning provides good query pruning without creating excessive parts.

### 3. Map type used in ORDER BY (materialized view) — Fixed
- **What was wrong:** The downsampling materialized view used `ORDER BY (metric_name, labels, ts_minute)` with the same Map-type `labels` column.
- **What was changed:** Changed to `ORDER BY (metric_name, ts_minute)`.
- **Why:** Same reason as issue #1 — Map types cannot be used in MergeTree ORDER BY keys.

## Review Notes
- The Prometheus remote_write YAML configuration is correct and uses valid field names and reasonable values.
- The tiered TTL syntax (`TO DISK 'cold_s3'` and `DELETE`) is valid ClickHouse syntax.
- The `avgState(value)` usage with `AggregatingMergeTree` in the downsampling MV is correct. Readers should note that querying this MV requires `avgMerge(avg_value)` to finalize the aggregate, which is not shown in the post.
- The error rate query has a minor redundancy: the WHERE clause already filters to `metric_name IN ('http_requests_total')`, making the inner `if(metric_name = 'http_requests_total', ...)` conditions always true. The query produces correct results but could be simplified.
- The storage cost comparison claims Prometheus TSDB uses "2-8 bytes" per sample. Prometheus's Gorilla-based compression typically achieves closer to 1.3-2 bytes per sample for well-compressed data. The 8-byte upper bound likely represents uncompressed samples. The range is broad but not incorrect.
- The "80-90% cheaper" claim for S3-tiered ClickHouse vs SSD/memory-backed Prometheus federation is plausible for the specific comparison but highly dependent on infrastructure specifics.
- The `Delta` codec on `DateTime64(3)` is a good choice for monotonically increasing timestamps and is correctly applied.
