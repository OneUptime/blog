# Validation Summary: How to Configure distributed_aggregation_memory_efficient in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse (Distributed tables, GROUP BY aggregation)
- ClickHouse server settings (`distributed_aggregation_memory_efficient`, `aggregation_memory_efficient_merge_threads`, `group_by_two_level_threshold`, `group_by_two_level_threshold_bytes`, `max_bytes_before_external_group_by`, `max_memory_usage`)
- ClickHouse system tables (`system.settings`, `system.query_log`)
- ClickHouse XML profile configuration

## Sources Consulted
- ClickHouse settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse query complexity restrictions: https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse TwoLevelHashTable source / discussion: https://github.com/ClickHouse/ClickHouse (TwoLevelHashTable.h, 256-bucket constant)
- Altinity Knowledge Base: GROUP BY https://kb.altinity.com/altinity-kb-queries-and-syntax/group-by/
- ClickHouse blog: Hash tables in ClickHouse https://clickhouse.com/blog/hash-tables-in-clickhouse-and-zero-cost-abstractions

## Issues Found
- **Bucket count attribution was incorrect.** The post originally stated "The number of buckets is controlled by `aggregation_memory_efficient_merge_threads`." This is wrong: per the ClickHouse docs, that setting controls the **number of merge threads** used in memory-efficient mode, not the bucket count. The bucket count in ClickHouse's two-level hash table is hardcoded at **256** (`TwoLevelHashTable` uses an 8-bit bucket index). I rewrote the bullet describing bucketing to reflect the fixed 256 buckets, corrected the peak-memory formula to `(total_partial_state_size / 256) * merge_threads`, and reworded the sentence introducing `aggregation_memory_efficient_merge_threads` to say it controls "the number of buckets merged in parallel."

## Review Notes
- In recent ClickHouse versions (21.x and later), `distributed_aggregation_memory_efficient` defaults to `1`. The post implicitly treats it as something operators must opt into, which is still valid framing for clusters running older versions or for explicit per-query overrides, but readers on modern ClickHouse will already have this enabled.
- All SQL examples (`uniq`, `uniqExact`, `formatReadableSize`, `today()`, `system.query_log` columns including `Settings['...']`, `log_comment`, `memory_usage`, `query_duration_ms`, `event_date`) are valid ClickHouse functions / columns.
- The XML profile uses the modern `<clickhouse>` root tag, which is correct for current ClickHouse versions (older versions used `<yandex>`).
- The `max_bytes_before_external_group_by` and `max_memory_usage` byte values are accurate (8 GiB = 8589934592, 15 GiB = 16106127360).
- The interaction described between `distributed_aggregation_memory_efficient` and `group_by_two_level_threshold` / `group_by_two_level_threshold_bytes` is accurate: the bucketed merge path requires two-level aggregation, which only triggers above those thresholds.
