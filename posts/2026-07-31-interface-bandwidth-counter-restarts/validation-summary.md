# Validation Summary: How to Calculate Interface Bandwidth from Byte Counters Without Spikes After Restarts

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus recording rules and YAML configuration
- Prometheus Node Exporter
- Linux network-interface counters
- Network bonds, VLANs, bridges, and virtual Ethernet interfaces

## Sources Consulted

- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus recording-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus recording-rule naming and aggregation practices](https://prometheus.io/docs/practices/rules/)
- [The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/)
- [Monitoring Linux host metrics with Node Exporter](https://prometheus.io/docs/guides/node-exporter/)
- [Node Exporter 1.12.1 Linux netdev collector source](https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/netdev_linux.go)
- [Node Exporter netdev metric construction](https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/netdev_common.go)
- [Node Exporter 1.12.1 process-metric registration](https://github.com/prometheus/node_exporter/blob/v1.12.1/node_exporter.go)
- [Prometheus Go client process collector](https://github.com/prometheus/client_golang/blob/main/prometheus/process_collector.go)
- [Linux kernel interface-statistics documentation](https://docs.kernel.org/networking/statistics.html)
- [Linux Ethernet Bonding Driver HOWTO](https://docs.kernel.org/networking/bonding.html)
- [Prometheus 3.13.2 and Node Exporter 1.12.1 release downloads](https://prometheus.io/download/)

## Issues Found

No technical issues found.

## Review Notes

- All 11 displayed PromQL expressions parsed successfully with `promtool` 3.13.2.
- The recording-rule YAML passed `promtool check rules` with both rules recognized.
- The `cluster` label and the example `job="node"` selector are deployment-specific and must match the labels used by the reader's Prometheus configuration.
- Node Exporter 1.12.1 exports `process_start_time_seconds` by default. That metric is absent if exporter self-metrics are disabled with `--web.disable-exporter-metrics`.
- The current Linux netdev collector prefers netlink and 64-bit link statistics, with a 32-bit fallback when 64-bit statistics are unavailable; this supports the post's counter-width warning.
