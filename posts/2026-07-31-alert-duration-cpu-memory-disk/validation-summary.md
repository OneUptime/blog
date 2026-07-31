# Validation Summary: How Long Should CPU, Memory, and Disk Stay High Before an Alert Fires?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus alerting rules
- PromQL
- Alertmanager
- Prometheus Node Exporter
- Linux Pressure Stall Information (PSI)
- Linux filesystem and block-device metrics
- SRE alert-duration design

## Sources Consulted

- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus rule configuration and syntax checking](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus query operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus alerting practices](https://prometheus.io/docs/practices/alerting/)
- [The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/)
- [Prometheus unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
- [Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Node Exporter pressure collector source](https://github.com/prometheus/node_exporter/blob/master/collector/pressure_linux.go)
- [Node Exporter disk statistics collector source](https://github.com/prometheus/node_exporter/blob/master/collector/diskstats_common.go)
- [Node Exporter filesystem collector source](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go)
- [Node Exporter Linux memory collector source](https://github.com/prometheus/node_exporter/blob/master/collector/meminfo_linux.go)
- [Linux kernel I/O statistics fields](https://www.kernel.org/doc/html/latest/admin-guide/iostats.html)
- [Linux kernel Pressure Stall Information documentation](https://www.kernel.org/doc/html/latest/accounting/psi.html)

## Issues Found

No technical issues found.

## Review Notes

- All PromQL expressions and alerting-rule fields in the post were checked with `promtool` 3.13.2; the validation rule file passed with 11 rules.
- The suggested alert durations and thresholds are appropriately presented as illustrative starting points rather than Prometheus defaults.
- `node_pressure_memory_waiting_seconds_total` depends on Linux PSI support (Linux 4.20 or newer with PSI enabled) and the Node Exporter pressure collector. On systems without that metric, the example critical expression returns no alert instance.
- The disk-latency expression calculates a combined read/write mean per completed operation. As expected for this form of ratio, an idle device with no completed operations can produce no finite latency value.
