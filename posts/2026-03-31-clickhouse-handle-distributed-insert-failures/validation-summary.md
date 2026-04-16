# Validation Summary: How to Handle Distributed INSERT Failures in ClickHouse

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- ClickHouse (Distributed table engine, async/sync inserts)
- `system.distribution_queue` and `system.text_log` system tables
- ClickHouse server configuration (`config.xml`) and Distributed table `SETTINGS`
- `SYSTEM FLUSH DISTRIBUTED` admin command
- Linux shell (systemctl) for operator recovery steps

## Sources Consulted
- ClickHouse docs — `system.distribution_queue`: https://clickhouse.com/docs/en/operations/system-tables/distribution_queue
- ClickHouse docs — Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse docs — Settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse docs — SYSTEM statements: https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse PR #23027 — context for `distributed_push_down_limit`

## Issues Found

1. **Incorrect `system.distribution_queue` columns.** The original query selected `host_name`, `host_port`, `task_count`, `failed_count`, `error`, none of which exist in this table. Replaced with the actual columns: `data_path`, `is_blocked`, `error_count`, `data_files`, `data_compressed_bytes`, `broken_data_files`, `last_exception`. Updated the filter column to `error_count` and the explanatory sentence to reference `last_exception`.

2. **Deprecated retry-setting names.** `distributed_directory_monitor_sleep_time_ms` / `…_max_sleep_time_ms` were renamed. Changed to `distributed_background_insert_sleep_time_ms` / `distributed_background_insert_max_sleep_time_ms` and added a note that the old names remain as aliases.

3. **Wrong description of `insert_distributed_one_random_shard`.** The post claimed `= 0` throws an error if any shard is unavailable. That setting governs behavior when there is no sharding key — nothing to do with shard availability. Replaced with `distributed_foreground_insert = 1` (formerly `insert_distributed_sync`), which is the correct way to force synchronous inserts that fail fast on unreachable shards.

4. **Wrong description of `distributed_push_down_limit`.** The post claimed `= 1` skips unavailable shards during inserts. That setting is a `SELECT` optimization for pushing `LIMIT` down to remote shards. Replaced with `skip_unavailable_shards = 1`, and clarified that it applies to distributed SELECTs.

5. **Wrong scope for `fsync_directories`.** The post showed it as a top-level `config.xml` element. It is a Distributed table engine setting, configured in the `CREATE TABLE … ENGINE = Distributed(…) SETTINGS` clause. Replaced the XML snippet with a correct `CREATE TABLE … SETTINGS fsync_directories = 1, fsync_after_insert = 1` example.

6. **`max_distributed_connections` misrepresented as spool-size control.** This setting caps concurrent outgoing connections for a single distributed query; it is not a spool-size guardrail. Replaced with the Distributed engine's `bytes_to_delay_insert` and `bytes_to_throw_insert` settings, which are the correct knobs for bounding the on-disk async-insert queue.

7. **Spool subdirectory names.** Examples used `shard1/`, `shard2/`, `shard3/`. ClickHouse actually names these per connection target, typically `shardN_replicaM/`. Updated both the `ls` example and the `rm` command accordingly.

8. **Monitoring query column fix.** Updated the "alert when spool files grow too large" query from `host_name`, `task_count` (nonexistent) to `data_files`, `data_compressed_bytes` with a `data_files > 10000` predicate.

## Review Notes

- `SYSTEM FLUSH DISTRIBUTED distributed_events;` syntax is correct and left unchanged. It supports `ON CLUSTER` and a `SETTINGS` suffix if needed.
- The `system.text_log` query is plausible but depends on `text_log` being enabled in `config.xml` — worth mentioning in a future revision.
- `data_path` in `system.distribution_queue` exposes the per-target subdirectory; operators can derive host/port from the directory name or the cluster config.
- Stopping `clickhouse-server` to delete `.bin` spool files is a blunt instrument — future revisions could mention `SYSTEM STOP DISTRIBUTED SENDS` as a less invasive alternative.
- The Distributed engine is primarily a routing layer; for the strictest durability guarantees, consider writing to the local `*_local` table on each shard directly or using Kafka/queue buffering in front of ClickHouse.
