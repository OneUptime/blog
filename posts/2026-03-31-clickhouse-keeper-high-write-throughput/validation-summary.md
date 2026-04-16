# Validation Summary: How to Tune ClickHouse Keeper for High Write Throughput

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- ClickHouse Keeper (coordination service, Raft-based)
- ClickHouse server (MergeTree settings, profiles, Buffer table engine)
- Prometheus / Alertmanager (alert rules)
- Linux OS tuning (limits.conf, transparent huge pages, I/O scheduler, sysctl)
- Four-letter-word commands (`stat`, `mntr`) and `clickhouse-keeper-client`

## Sources Consulted
- [ClickHouse Keeper documentation](https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper)
- [clickhouse-keeper-client docs](https://clickhouse.com/docs/operations/clickhouse-keeper)
- [MergeTree settings reference](https://clickhouse.com/docs/operations/settings/merge-tree-settings)
- [ClickHouse settings reference (system.settings)](https://clickhouse.com/docs/operations/system-tables/settings)
- [Prometheus integration docs](https://clickhouse.com/docs/integrations/prometheus)
- [PR #29417 — Compress keeper snapshots with default ZSTD codec](https://github.com/ClickHouse/ClickHouse/pull/29417)
- [PR #53049 — Try batching multiple flush requests in Keeper](https://github.com/ClickHouse/ClickHouse/pull/53049)

## Issues Found

1. **Incorrect XML comments in the "Batching Writes" section.** The comment for `max_requests_batch_bytes_size` claimed it was a wait-time in milliseconds, and `max_request_queue_size` was described as "Max bytes in a single batch". Both are wrong: `max_requests_batch_bytes_size` is the maximum batch size in bytes, and `max_request_queue_size` is the maximum number of pending requests in the request queue. Updated the comments to reflect the actual semantics, and added a note that whichever batch limit (count or bytes) is reached first triggers the flush.

2. **`min_insert_block_size_rows` / `min_insert_block_size_bytes` placed under `<merge_tree>`.** These are session/profile settings, not MergeTree table settings — they belong under `<profiles><default>` in a `users.d/*.xml` file. `max_bytes_to_merge_at_max_space_in_pool` is a valid MergeTree setting and stays under `<merge_tree>`. Split the example into two XML blocks (one for `users.d`, one for `config.d`) and clarified the surrounding sentence.

3. **Misleading description of `clickhouse-keeper-client`.** The "Benchmarking" section called it the "built-in benchmark tool". It is the interactive client, not a benchmarking utility. Reworded to "built-in client to exercise basic operations" so readers do not expect throughput-measurement output from the snippet shown.

## Review Notes
- The Raft write-path description (steps 1–6) is consistent with how ClickHouse Keeper's NuRaft-based replication works.
- The Buffer table engine signature `Buffer(database, table, num_layers, min_time, max_time, min_rows, max_rows, min_bytes, max_bytes)` is correct and matches the values in the example.
- The `compress_logs` (default `false`) and `compress_snapshots_with_zstd_format` (default `true`) settings live in `coordination_settings` as shown — note that `compress_snapshots_with_zstd_format` must match across all quorum replicas, which the post does not call out but is worth being aware of.
- Prometheus alert metric names (`ClickHouseAsyncMetrics_KeeperAvgLatency`, `ClickHouseAsyncMetrics_KeeperOutstandingRequests`) follow the standard exporter naming convention; specific metric availability depends on the ClickHouse version and exporter configuration.
- OS-level recommendations (disabling THP, `mq-deadline` scheduler for NVMe, raised `nofile` limits, larger socket buffers) align with the standard ClickHouse production tuning guidance.
- The throughput target of "50,000–100,000 ops/sec with sub-millisecond average latency" on NVMe SSDs is a reasonable rule of thumb but will vary heavily with hardware, network, and quorum size — readers should benchmark on their own setup.
