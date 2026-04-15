# Validation Summary: How to Optimize ClickHouse Network Settings for WAN

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (server configuration, distributed queries, replication)
- Linux kernel TCP/IP networking (sysctl parameters)
- TCP BBR congestion control algorithm
- clickhouse-driver Python client library
- sysstat (sar) monitoring tool

## Sources Consulted
- ClickHouse official documentation — Server Settings: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse official documentation — Session/Query Settings: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse official documentation — Compression: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse official documentation — MergeTree Settings: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- clickhouse-driver Python library documentation: https://clickhouse-driver.readthedocs.io/en/latest/features.html
- Linux kernel networking documentation for sysctl TCP parameters
- Google BBR congestion control algorithm documentation and research papers

## Issues Found
No changes were made to the post. The following minor imprecisions were noted but do not warrant corrections as they do not cause failures or significantly mislead readers:

1. **`<compression>` XML config is for storage, not network compression**: The XML snippet shown under "ClickHouse Compression for WAN" configures MergeTree storage compression (on-disk data parts), not wire/network compression. Network compression in the ClickHouse native protocol is controlled by the `network_compression_method` setting (default: LZ4, already enabled by default). The Python client `compression=True` part IS correct for network compression. The overall advice to use compression for WAN is sound, though the XML config's relationship to WAN transfer is indirect.

2. **`connect_timeout_with_failover_ms` default is already 1000ms**: Since ClickHouse v23.5, the default for `connect_timeout_with_failover_ms` was changed from 50ms to 1000ms. The blog suggests setting it to 1000ms as a WAN optimization, but this is already the default in current versions. For true WAN optimization with 10-100ms latency, a higher value (e.g., 5000-10000ms) may be more appropriate.

3. **`distributed_connections_pool_size` is a server-level setting**: The blog shows `SET distributed_connections_pool_size = 50;` as a SQL command, but this setting is a server-level configuration parameter (not a session/query setting). It should be configured in the server XML config file rather than via `SET`. The `max_distributed_connections` setting shown alongside it IS correctly a query-level setting.

## Review Notes
- All Linux sysctl commands for TCP buffer tuning and BBR congestion control are correct and follow standard best practices for high-bandwidth WAN links.
- The replication throttling settings (`max_replicated_fetches_network_bandwidth_for_server` and `max_replicated_sends_network_bandwidth_for_server`) are valid server settings. The stated value of 52428800 bytes/s is technically 50 MiB/s (not exactly 50 MB/s as stated), but this is a negligible difference in practice.
- The monitoring commands (`sar` and `system.metrics` query) are correct and practical.
- The post would benefit from mentioning that ClickHouse's native protocol already uses LZ4 compression by default, which readers should be aware of when planning WAN optimizations.
- The Python client code snippet correctly uses the `clickhouse-driver` library's `compression` parameter, which defaults to LZ4 when set to `True`.
