# Validation Summary: Why Prometheus CPU Metrics Can Exceed 100%—Cores, Rates, and Aggregation Explained

## Status

validated

## Post Type

Technical guide and PromQL reference

## Technologies Covered

- Prometheus and PromQL
- Prometheus node exporter
- Linux `/proc/stat` CPU accounting
- Prometheus alerting rules
- Container CPU metrics exposed by cAdvisor and the Kubernetes kubelet
- Dashboard percentage-unit formatting

## Sources Consulted

- [Linux kernel documentation for `/proc/stat`](https://docs.kernel.org/filesystems/proc.html#miscellaneous-kernel-statistics-in-proc-stat)
- [Prometheus query function documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus operator documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus alerting-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus alerting practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus node exporter Linux CPU collector source](https://github.com/prometheus/node_exporter/blob/master/collector/cpu_linux.go)
- [Prometheus node exporter common CPU metric definition](https://github.com/prometheus/node_exporter/blob/master/collector/cpu_common.go)
- [Prometheus node exporter mixin recording rules](https://github.com/prometheus/node_exporter/blob/master/docs/node-mixin/rules/rules.libsonnet)
- [cAdvisor Prometheus metric documentation](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md)
- [Kubernetes metrics reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Grafana field-unit override documentation](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-overrides/)

## Issues Found

- The expression described as selecting modes in which the CPU “executed work” included `steal`. Linux defines steal as involuntary wait time, and no application work is completed by the guest during that time. Removed `steal` from the execution-mode matcher, changing it from `mode=~"user|nice|system|irq|softirq|steal"` to `mode=~"user|nice|system|irq|softirq"`. The following paragraph already directs readers to keep steal visible separately.

## Review Notes

- The post deliberately distinguishes the common non-idle definition from executed CPU work. Its `1 - idle` and equivalent non-idle expressions include `iowait` and `steal`; the post accurately explains the interpretation and caveats.
- Current node exporter releases expose guest time separately as `node_cpu_guest_seconds_total` and do not add guest modes to `node_cpu_seconds_total`, avoiding double counting in the shown expressions.
- The PromQL expressions were syntax-checked with `promtool` 3.13.2, and the alerting-rule YAML was checked with the same release.
