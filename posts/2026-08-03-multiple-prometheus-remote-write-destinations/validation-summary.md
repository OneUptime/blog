# Validation Summary: Multiple Remote Write Destinations: Fan-Out, Failover, and the Cost of Each

## Status
validated

## Post Type
Technical configuration, resilience, and capacity-planning guide

## Technologies Covered

- Prometheus
- Prometheus Remote Write 1.0 and 2.0
- Prometheus write relabeling
- Prometheus Remote Write queue manager and WAL watchers
- PromQL
- Protocol Buffers and Snappy compression
- High availability and disaster recovery

## Sources Consulted

- [Prometheus Remote Write configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus relabel configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus Remote Write tuning guide](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus v3.13.2 Remote Write queue manager implementation](https://github.com/prometheus/prometheus/blob/v3.13.2/storage/remote/queue_manager.go)
- [Prometheus changelog](https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md)

## Issues Found
No technical issues found.

## Review Notes

- The `remote_write` YAML examples use valid current fields. The `name` values are unique, `authorization.credentials_file` is supported, the write relabel rules are valid, and the queue settings match current defaults except for the intentionally reduced `max_shards` value.
- Prometheus creates an independent queue manager and WAL watcher for each Remote Write destination. The post correctly distinguishes concurrent fan-out from active-passive failover and correctly describes destination-specific relabeling, retries, ordering, and queue isolation.
- All monitoring metric names in the PromQL examples are current in Prometheus 3.13.2. The queue-manager implementation attaches `remote_name` and `url` labels to these metrics and defines `prometheus_remote_storage_bytes_total` as compressed data bytes sent by the queue.
- `prometheus_remote_storage_queue_highest_timestamp_seconds` is the current lag input metric in recent Prometheus releases. Operators on older Prometheus versions may need to adapt dashboards that use the older `prometheus_remote_storage_highest_timestamp_in_seconds` metric.
- The `round_robin_dns` option and the Remote Write 2.0 specification remain experimental in current official documentation, as the post indicates or links. The post's core fan-out conclusions do not depend on Remote Write 2.0.
- The official tuning guide currently describes a two-hour WAL recovery window before unsent data can be lost through WAL compaction. The post correctly advises testing outages that exceed the applicable recovery window without hard-coding that implementation-dependent duration.
