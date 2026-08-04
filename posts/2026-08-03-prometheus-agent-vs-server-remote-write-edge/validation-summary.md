# Validation Summary: Prometheus Agent Mode vs. Full Prometheus for Remote Write at the Edge

## Status
validated

## Post Type
Technical architecture and operations guide

## Technologies Covered
- Prometheus Agent mode
- Prometheus server mode and local TSDB
- Prometheus Remote Write
- Write-ahead logs (WALs)
- PromQL and Remote Write self-monitoring metrics
- Alerting and recording rules
- Edge monitoring and high-availability collection patterns

## Sources Consulted
- [Prometheus Agent Mode](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
- [Prometheus command-line reference](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus storage documentation](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus v3.13.2 Remote Write queue implementation](https://github.com/prometheus/prometheus/blob/v3.13.2/storage/remote/queue_manager.go)
- [Prometheus changelog](https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md)

## Issues Found
- The high-availability discussion said two Agents sending identical label sets could produce duplicate series. Identical label sets identify the same Prometheus time series, so the text now explains that the receiver sees competing sample streams in one series; these streams can be mixed or can cause duplicate-timestamp or out-of-order samples.
- The Remote Write monitoring explanation treated the highest-sent timestamp as delivery freshness and all dropped samples as unplanned permanent loss. The current queue advances past irrecoverable failures, and `prometheus_remote_storage_samples_dropped_total` includes a `reason="dropped_series"` case for intentional write relabeling. The text now describes the timestamp as queue progress, requires checking failure counters alongside it, and distinguishes intentional drops from `too_old` and `unintentionally_dropped_series` loss.

## Review Notes
- Reviewed against Prometheus 3.13.2, the current release on the validation date. The configuration keys, Agent and server CLI flags, current Agent retention defaults (`5m` minimum and `4h` maximum), PromQL expressions, and documentation URLs are valid.
- The Agent Mode overview still describes a two-hour buffer, while the current command reference documents the configurable Agent WAL retention defaults above. The post correctly warns readers to check the deployed binary's help and configured arguments.
- `queue_config.retry_on_http_429` is valid but remains marked experimental in the current configuration reference.
