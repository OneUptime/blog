# Validation Summary: How to Use parallel_replicas Settings in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (parallel replicas feature)
- ReplicatedMergeTree engine
- ClickHouse cluster configuration (remote_servers)
- system.query_log monitoring

## Sources Consulted
- ClickHouse official documentation: Parallel Replicas (https://clickhouse.com/docs/deployment-guides/parallel-replicas)
- ClickHouse official documentation: Session Settings (https://clickhouse.com/docs/operations/settings/settings)
- ClickHouse official documentation: system.query_log (https://clickhouse.com/docs/operations/system-tables/query_log)
- ClickHouse source code: src/Core/Settings.cpp (setting definitions and aliases)
- ClickHouse GitHub PR #63151: Rework parallel replicas settings

## Issues Found

1. **`parallel_replicas_for_non_replicated_merge_tree` misrepresented as a required coordinator setting.** The original post included `SET parallel_replicas_for_non_replicated_merge_tree = 1` with the comment "Required: set a coordinator." This setting actually enables parallel replicas for *non-replicated* MergeTree tables and is not a coordinator setting nor required for the common ReplicatedMergeTree case. Replaced with `cluster_for_parallel_replicas = 'my_cluster'`, which IS required to specify the cluster for parallel replica coordination.

2. **Missing `cluster_for_parallel_replicas` setting.** This setting is required for parallel replicas to work — it tells ClickHouse which cluster's replicas to use for coordination. It was missing from all code examples (SET block, inline SETTINGS, and users.xml). Added it to all three locations.

3. **`parallel_replicas_min_number_of_granules_to_enable` is obsolete.** The original post referenced this setting as controlling the minimum table size threshold. This setting has been marked as OBSOLETE in ClickHouse source code and no longer has any effect. Removed the code example and replaced the section content with an accurate description of the distribution mechanism.

4. **Granule distribution described as "consistent hashing" — misleading.** The original post claimed ClickHouse uses "a consistent hashing scheme to distribute mark ranges." The actual mechanism for the new parallel replicas implementation (23.3+) is a coordinator-based dynamic task distribution with task-stealing semantics, where faster replicas automatically get more work. Consistent hashing is only used as a secondary cache-locality optimization. Updated the description to accurately reflect the coordinator-based approach.

## Review Notes
- The setting `allow_experimental_parallel_reading_from_replicas` is the canonical name but has a newer alias `enable_parallel_replicas`. Both are valid. The post uses the canonical name, which is correct.
- The `allow_experimental_parallel_reading_from_replicas` setting accepts values 0 (disabled), 1 (enabled, silently disable on failure), and 2 (enabled, throw exception on failure). The post uses value 1, which is the standard choice.
- The monitoring queries using `system.query_log` are correct — `query_duration_ms`, `read_rows`, `read_bytes`, and `Settings` (Map type) are all valid columns.
- The remote_servers XML configuration for defining a cluster with replicas is correctly formatted.
