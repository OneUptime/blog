# Validation Summary: How to Tune ClickHouse Keeper Performance Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse Keeper
- Raft consensus protocol (NuRaft)
- ClickHouse coordination settings
- clickhouse-keeper-client CLI

## Sources Consulted
- ClickHouse Keeper official documentation: https://clickhouse.com/docs/en/operations/clickhouse-keeper
- ClickHouse source code: `CoordinationSettings.cpp` for setting names, types, and default values
- ClickHouse Keeper four-letter-word commands documentation
- ClickHouse Keeper client documentation

## Issues Found
1. **Inaccurate comment on `max_requests_batch_size`**: The XML comment described it as "Maximum in-flight operations in Raft pipeline." Per the source code, this setting controls the "Max size of batch of requests sent to RAFT" — it is about batching requests together, not about in-flight pipeline operations. Fixed the comment to "Max size of batch of requests sent to Raft."

2. **Inaccurate comment on `operation_timeout_ms` and `session_timeout_ms`**: The XML comment "Deadline for reading from a follower" was applied to both settings. Per the source code, `operation_timeout_ms` is the "Default client operation timeout" and `session_timeout_ms` is the "Default client session timeout." Neither is specifically about reading from a follower. Fixed to use separate, accurate comments for each setting.

## Review Notes
- All setting names (`snapshot_distance`, `snapshots_to_keep`, `rotate_log_storage_interval`, `heart_beat_interval_ms`, `election_timeout_lower_bound_ms`, `election_timeout_upper_bound_ms`, `max_requests_batch_size`, `operation_timeout_ms`, `session_timeout_ms`, `raft_logs_level`) are verified as real ClickHouse Keeper coordination settings.
- The values shown for most settings match their documented defaults. `session_timeout_ms` is shown as `30000` while the actual default is `100000` (100 seconds); this is acceptable in a tuning guide context but readers should be aware the default is higher.
- The `raft_logs_level` comment lists four valid values (`trace, debug, information, warning`), which are indeed valid but not exhaustive — other valid values include `none`, `fatal`, `error`, and `test`.
- `log_storage_path` and `snapshot_storage_path` are correctly shown outside of `<coordination_settings>` (they are direct children of `<keeper_server>`).
- The `clickhouse-keeper-client` command, port 9181, and `mntr` four-letter-word command are all correct. All listed metrics (`zk_avg_latency`, `zk_max_latency`, `zk_outstanding_requests`, `zk_packets_received`, `zk_packets_sent`) are real mntr output fields.
- The claim "Keeper log writes are synchronous by default" is accurate — the `force_sync` setting defaults to `true`, meaning fsync is called on each coordination log write.
