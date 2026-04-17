# Validation Summary: What Is Distributed Table Engine and How It Routes Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Distributed table engine
- ClickHouse ReplicatedMergeTree
- ClickHouse cluster configuration (`remote_servers`)
- Sharding keys (`cityHash64`, `intHash32`)
- Distributed aggregation and `distributed_group_by_no_merge`
- Background insert / directory monitor settings
- `system.clusters`, `clusterAllReplicas`, `system.parts`

## Sources Consulted
- [ClickHouse Docs: Distributed table engine](https://clickhouse.com/docs/engines/table-engines/special/distributed)
- [ClickHouse PR #55978: Rename directory monitor concept into background INSERT](https://github.com/ClickHouse/ClickHouse/pull/55978)
- [ClickHouse Docs: AggregatingMergeTree](https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree)
- [ClickHouse Issue #35605: Details about how distributed_group_by_no_merge works](https://github.com/ClickHouse/ClickHouse/issues/35605)
- [PostHog handbook: Data replication and distributed queries](https://posthog.com/handbook/engineering/clickhouse/replication)

## Issues Found

1. **Incorrect description of default distributed aggregation behavior.** The post said: *"By default, ClickHouse sends raw data to the coordinator for the final aggregation stage."* This is wrong — by default each shard computes a partial aggregation state (e.g. via the `-State` combinator internally), and the initiator/coordinator merges those states. Rewrote the paragraph to describe partial states correctly and clarified when `distributed_group_by_no_merge` helps (GROUP BY key aligned with the sharding key).

2. **Outdated setting name `distributed_directory_monitor_sleep_time_ms`.** This setting was renamed to `distributed_background_insert_sleep_time_ms` as part of the "directory monitor → background INSERT" rename (PR #55978, shipped in 23.x). Replaced the setting name with the modern one and left a note about the legacy alias. Also fixed the inline comment, which said "seconds" but the unit is milliseconds.

3. **Fictitious setting `distributed_max_pending_bytes_per_insert_block`.** This setting does not exist in ClickHouse documentation or source. Replaced it with a real, related setting (`distributed_background_insert_batch`) that controls how background inserts are batched when forwarded to shards.

## Review Notes
- The sharding formula block (`shard_index = sharding_key_value % number_of_shards`) is a simplification that is only exactly accurate when every shard has `weight = 1` (which matches the XML config shown). ClickHouse technically computes `sharding_key % sum(weights)` and maps the remainder into weighted half-open intervals. Since the post's config uses equal weights, the simplification is acceptable in context and was left as-is.
- The `distributed_group_by_no_merge` example uses `GROUP BY user_id` while the table is sharded by `cityHash64(user_id)`. This works (each user's rows are on one shard), so the example is valid; just noting that readers who change the sharding key must re-evaluate whether this setting still applies.
- The advice to bypass the Distributed layer for very high insert rates is consistent with official ClickHouse guidance.
- The `clusterAllReplicas('my_cluster', system.parts)` query is correct usage — `system.parts` is local per-node, so `clusterAllReplicas` fans the lookup out to every replica.
