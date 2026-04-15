# Validation Summary: How to Use ReplicatedMergeTree for High Availability in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine family)
- ZooKeeper / ClickHouse Keeper (coordination service)
- SQL (DDL and query examples)
- XML configuration for ClickHouse server settings

## Sources Consulted
- ClickHouse official documentation: ReplicatedMergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse official documentation: MergeTree engine family — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family
- ClickHouse official documentation: system.replicas table — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse official documentation: MergeTree settings — https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse official documentation: Server settings (quorum, load balancing) — https://clickhouse.com/docs/en/operations/settings/settings

## Issues Found

1. **Incorrect comment on ReplacingMergeTree (line 69)**: The comment said "Replicated with deduplication by primary key." ReplacingMergeTree replaces rows with the same sorting key (ORDER BY) during background merges — it is not deduplication by primary key. Changed to "Replicated with row replacement by sorting key during merges."

2. **Missing ReplicatedGraphiteMergeTree variant**: The section titled "All ReplicatedMergeTree Variants" omitted `ReplicatedGraphiteMergeTree`. Added `ReplicatedGraphiteMergeTree(path, replica, 'graphite_rollup_config')` to complete the list.

3. **Incorrect comment for `max_replicated_fetches_network_bandwidth` (line 98-99)**: The XML comment said "Maximum number of parts to download in parallel per table," but this setting controls the maximum network bandwidth in bytes per second for replication fetches, not the parallelism count. Corrected the comment to "Maximum network bandwidth for replication fetches in bytes per second (0 = unlimited)."

4. **Misleading quorum comment (line 112)**: The comment said "Require all replicas to confirm a write before returning success" but the setting `insert_quorum = 2` only requires 2 replicas, not all replicas. In clusters with more than 2 replicas, this distinction matters. Changed to "Require 2 replicas to confirm a write before returning success."

## Review Notes
- The settings `replication_queue_max_wait_ms` and `retry_period_ms` in the XML config block could not be verified as standard MergeTree settings in current ClickHouse documentation. They may be valid internal settings or may have been renamed. Authors should verify these against the target ClickHouse version.
- The `replicated_deduplication_window` explanation is slightly simplified — it tracks block-level hash sums, not per-row checksums. Each INSERT typically produces one block, so saying "last 1000 inserts" is a reasonable approximation for the target audience.
- The post correctly recommends macros (`{shard}`, `{replica}`) for production use and covers a good breadth of operational concerns (monitoring, read-only mode, quorum, ZooKeeper paths).
