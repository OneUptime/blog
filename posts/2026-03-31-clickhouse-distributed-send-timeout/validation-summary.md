# Validation Summary: How to Configure ClickHouse Distributed Send Timeout

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (Distributed table engine)
- ClickHouse server settings (XML configuration and per-query SETTINGS)
- ClickHouse `system.clusters` system table

## Sources Consulted
- ClickHouse Settings reference: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse Server Configuration Parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse system.clusters docs: https://clickhouse.com/docs/operations/system-tables/clusters
- ClickHouse Settings.cpp source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp
- PR #55978 (rename directory monitor → background INSERT): https://github.com/ClickHouse/ClickHouse/pull/55978
- Altinity KB Client Timeouts: https://kb.altinity.com/altinity-kb-setup-and-maintenance/client-timeouts/

## Issues Found
Three technical issues were found and corrected:

1. **Fabricated setting `distributed_send_timeout`**: This setting does not exist in ClickHouse. Verified against the official settings documentation and the `Settings.cpp` source. Replaced all references with `send_timeout` (socket-level send timeout that governs how long the initiator waits when writing to a remote shard). The intro paragraph was reworded so it explains the real semantics (`send_timeout` for writing, `receive_timeout` for waiting for the response). The table row, XML config snippet, per-query SETTINGS example, and both "Tuning for Different Scenarios" blocks were all updated. The description/front-matter line was also updated.

2. **Fabricated setting `distributed_connection_timeout_ms`**: This setting does not exist. Removed from the XML config snippet. The correct setting for Distributed-engine connection timeout (`connect_timeout_with_failover_ms`) was already present in the snippet and is retained.

3. **Deprecated settings `distributed_directory_monitor_sleep_time_ms` / `distributed_directory_monitor_max_sleep_time_ms`**: These were renamed in ClickHouse PR #55978 to `distributed_background_insert_sleep_time_ms` and `distributed_background_insert_max_sleep_time_ms`. The old names remain as aliases for backward compatibility, but the post should use the current names. Updated the XML snippet in the "Async Distributed Sends" section.

Minor additional fix: moved the "Key Timeout Settings" XML snippet's comment from `config.xml` to `users.xml profile`, since `send_timeout` / `receive_timeout` / `connect_timeout_with_failover_ms` are profile/user settings rather than server-configuration-parameter keys.

The summary paragraph was updated to list the real settings.

## Review Notes
- Error code 159 ("Timeout exceeded while reading from socket") is accurate.
- The `system.clusters` columns used in the diagnostic query (`shard_num`, `host_name`, `is_local`, `errors_count`, `estimated_recovery_time`) all exist.
- `skip_unavailable_shards` is a real setting and the usage example is correct.
- `SET` and `SETTINGS` syntax shown is valid ClickHouse SQL.
- The default for `send_timeout` / `receive_timeout` is 300 seconds; the tuning values chosen in the post are reasonable examples.
