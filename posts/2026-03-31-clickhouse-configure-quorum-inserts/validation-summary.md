# Validation Summary: How to Configure Quorum Inserts in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree replication)
- ClickHouse settings: `insert_quorum`, `insert_quorum_timeout`, `insert_quorum_parallel`, `select_sequential_consistency`
- ClickHouse system tables: `system.zookeeper`, `system.query_log`
- ZooKeeper / ClickHouse Keeper (implied, via `/clickhouse/tables/.../quorum` paths)

## Sources Consulted
- ClickHouse settings reference: https://clickhouse.com/docs/en/operations/settings/settings (sections `#insert_quorum`, `#insert_quorum_parallel`, `#insert_quorum_timeout`, `#select_sequential_consistency`)
- Authoritative defaults in ClickHouse source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp (lines ~2074, 2102, 2111, 2129)
- Quorum-failure cleanup implementation: https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/ReplicatedMergeTreeSink.cpp and https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/ReplicatedMergeTreeRestartingThread.cpp (`removeFailedQuorumParts()`)

## Issues Found

1. **Incorrect default for `insert_quorum_parallel`.** The post stated "By default, ClickHouse does not allow parallel quorum inserts into the same table" and showed `SET insert_quorum_parallel = 1` as the way to "enable" concurrent quorum inserts. This is backwards: the default is `1` (enabled). The example as written is a no-op. Fixed the section to describe the true default (parallel quorum inserts allowed by default) and changed the example to `SET insert_quorum_parallel = 0` to illustrate the non-default (serialized) case, which is also what integrates with `select_sequential_consistency`.

2. **`select_sequential_consistency` example would not work with default settings.** The official docs explicitly state "When `insert_quorum_parallel` is enabled (the default), then `select_sequential_consistency` does not work." The post's read-after-write example only set `insert_quorum` and `select_sequential_consistency`, so under default settings the guarantee would silently not apply. Added `SET insert_quorum_parallel = 0;` to the example and a sentence noting the dependency.

## Review Notes

- The XML profile example uses `insert_quorum_timeout=60000` (60 s); this is a user choice and is valid, but readers should be aware the shipped default is `600000` ms (10 min) — not a bug, just worth noting.
- The ZooKeeper path `/clickhouse/tables/default/events/quorum` in the "Checking Quorum Status" example assumes a specific `zookeeper_path` macro pattern. Installations using different `zookeeper_path` in their `ReplicatedMergeTree` engine arguments will need to adjust the path. The example is representative and correct in spirit.
- The claim about failed quorum inserts being "cleaned up automatically" is correct: failure markers are written under `/quorum/failed_parts/<part_name>` and cleaned up by `ReplicatedMergeTreeRestartingThread::removeFailedQuorumParts()` on replica restart. The user-facing docs also confirm the inserted block is deleted from replicas where it was already written.
- `insert_quorum` also accepts the value `'auto'`, which resolves to `number_of_replicas / 2 + 1` (majority). Not mentioned in the post, but not incorrect to omit for a beginner tutorial.
- These settings are documented as not applicable to SharedMergeTree (ClickHouse Cloud). Out of scope for this post but worth noting for cloud users.
