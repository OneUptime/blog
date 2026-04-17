# Validation Summary: How to Configure max_parallel_replicas in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- `max_parallel_replicas` setting
- `parallel_replicas_custom_key` / `parallel_replicas_custom_key_filter_type`
- ReplicatedMergeTree engine family
- `system.query_log` and ProfileEvents

## Sources Consulted
- ClickHouse ProfileEvents source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp
- ClickHouse 23.3 release notes: https://clickhouse.com/blog/clickhouse-release-23-03
- ClickHouse settings documentation: https://clickhouse.com/docs/en/operations/settings/settings
- PR #45108 (Add support for custom key in parallel replicas): https://github.com/ClickHouse/ClickHouse/pull/45108

## Issues Found
- The "Checking Parallel Replica Usage" query referenced ProfileEvents named `ParallelReplicasReadAssignedParts` and `ParallelReplicasReadUnassignedParts`. These names do not exist in ClickHouse. The actual ProfileEvents track work at the granularity of marks, not parts: `ParallelReplicasReadAssignedMarks` and `ParallelReplicasReadUnassignedMarks`. I updated the SELECT list, the column aliases (`assigned_marks` / `unassigned_marks`), and the explanatory sentence below the snippet to use the correct names. `ParallelReplicasHandleRequestMicroseconds` was already correct.

## Review Notes
- The high-level explanation that ClickHouse "divides the part list of a shard among N replicas" is a reasonable simplification for a beginner-friendly intro, but in current ClickHouse the work distribution actually happens at the granule/mark level via consistent hashing (which is now consistent with the ProfileEvents we expose after the fix).
- `parallel_replicas_custom_key_filter_type` valid values are `'default'` (modulo-based) and `'range'`. The post uses `'range'`, which is correct.
- The `parallel_replicas_custom_key` setting was indeed introduced in ClickHouse 23.3 (per the release notes) — version claim verified.
- Note for future updates: ClickHouse 24.x introduced a newer "analyzer-based" parallel replicas implementation that no longer requires a custom key for many cases (controlled by settings like `allow_experimental_parallel_reading_from_replicas` / `enable_parallel_replicas`); readers on very recent versions may want to consult current docs for the latest recommended setup.
