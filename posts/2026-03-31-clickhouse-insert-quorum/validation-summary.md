# Validation Summary: How to Use insert_quorum Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ReplicatedMergeTree
- `insert_quorum`, `insert_quorum_timeout`, `insert_quorum_parallel`, `select_sequential_consistency` settings
- `system.replicas` system table

## Sources Consulted
- ClickHouse official settings source: https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Core/Settings.cpp (authoritative DECLARE defaults for `insert_quorum`, `insert_quorum_timeout`, `insert_quorum_parallel`, `select_sequential_consistency`)
- ClickHouse docs: https://clickhouse.com/docs/en/operations/system-tables/replicas (verified columns `database`, `table`, `replica_name`, `is_leader`, `total_replicas`, `active_replicas`, `queue_size`, `inserts_in_queue`, `absolute_delay`)
- ClickHouse docs: https://clickhouse.com/docs/en/operations/settings/settings (settings reference)

## Issues Found
- **Incorrect claim about `select_sequential_consistency` behavior under default settings.** The post originally stated: *"By default, after a quorum insert, subsequent queries on any replica return the inserted data (via `select_sequential_consistency`)."* This is wrong. Per the official ClickHouse source, when `insert_quorum_parallel` is enabled (the default value is `true`/`1`), `select_sequential_consistency` does **not** work — because parallel quorum inserts can be written to different sets of replicas, no single replica is guaranteed to have all writes. Sequential consistency requires both `insert_quorum_parallel = 0` **and** `select_sequential_consistency = 1`. I rewrote the section to describe this correctly and updated the example to include `SET select_sequential_consistency = 1;`.

## Review Notes
- Verified defaults against `Settings.cpp`:
  - `insert_quorum` default `0` ✓
  - `insert_quorum_timeout` type `Milliseconds`, default `600000` (= 600 seconds / 10 minutes) ✓
  - `insert_quorum_parallel` default `true` (i.e. `1`) ✓
  - `select_sequential_consistency` default `0`
- The `insert_quorum = 'auto'` mode (majority quorum = `number_of_replicas / 2 + 1`) is supported but intentionally not covered by the post; this is a reasonable scope choice.
- All `system.replicas` columns referenced (`database`, `table`, `replica_name`, `is_leader`, `total_replicas`, `active_replicas`, `queue_size`, `inserts_in_queue`, `absolute_delay`) exist in current ClickHouse.
- SQL syntax (query-level `SETTINGS` clause, session-level `SET`, `INSERT ... SELECT ... SETTINGS`) is valid.
- Minor caveat readers should know but wasn't an error: on failed quorum, ClickHouse deletes the partial block from replicas where it was already written (mentioned in the post as "rolled back", which is accurate in effect).
