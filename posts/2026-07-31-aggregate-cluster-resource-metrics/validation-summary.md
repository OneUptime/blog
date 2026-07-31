# Validation Summary: How to Aggregate CPU, Memory, and Disk Metrics Across a Cluster Without Averaging Percentages Incorrectly

## Status

validated

## Post Type

Technical guide / PromQL capacity-planning reference

## Technologies Covered

- Prometheus 3.13.1
- PromQL
- Prometheus recording rules and YAML rule groups
- node_exporter
- Linux CPU accounting, `/proc/stat`, and `/proc/meminfo`
- Cluster CPU, memory, filesystem, and scrape-coverage metrics

## Sources Consulted

- Prometheus recording-rule best practices: https://prometheus.io/docs/practices/rules/
- Prometheus query functions, including `rate()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query and aggregation operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus recording-rule configuration: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus 3.13.1 release: https://github.com/prometheus/prometheus/releases/tag/v3.13.1
- node_exporter collector and deployment documentation: https://github.com/prometheus/node_exporter
- node_exporter Linux CPU collector source: https://github.com/prometheus/node_exporter/blob/master/collector/cpu_linux.go
- node_exporter filesystem collector metric definitions: https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go
- Linux kernel `/proc` documentation for CPU and memory fields: https://docs.kernel.org/filesystems/proc.html

## Issues Found

- The cluster CPU denominator counted current raw idle-counter series while the numerator used `rate()` results. A newly discovered or sparsely sampled CPU can exist in the raw instant vector without producing a usable rate, which makes the denominator and numerator cover different series. Changed both the direct query and recording rule to count the same `rate(node_cpu_seconds_total{mode="idle"}[5m])` result used by the numerator.
- The guest CPU warning implied that guest time was another mode to add from `node_cpu_seconds_total`. On current node_exporter, Linux guest time remains included in user/nice accounting but is exposed separately as `node_cpu_guest_seconds_total`. Clarified that double counting occurs when those separate guest counters are added to the non-idle `node_cpu_seconds_total` rates.
- `count by (cluster) (up{job="node"} == 1)` drops all failed targets before aggregation and therefore returns no series for a cluster when every target is down. Replaced it with `sum by (cluster) (up{job="node"})`, which counts healthy targets while preserving a zero-valued result for an all-down cluster. Also qualified the claim that disappearing hosts always make ratios optimistic; the result is generally misleading and only may look optimistic.

## Review Notes

- All PromQL examples and the complete YAML recording-rule group were parsed successfully with `promtool` 3.13.1 (16 validation rules in total).
- The post correctly aggregates ratio numerators and denominators separately, matching Prometheus recording-rule guidance.
- The memory calculation correctly uses Linux's `MemAvailable` estimate rather than `MemFree`.
- The filesystem calculation correctly uses `node_filesystem_avail_bytes`, which node_exporter defines as space available to non-root users, and the post appropriately warns against aggregating duplicate or incomparable mounts.
- The heterogeneous-host CPU example is arithmetically correct: `14.8 / 66` is approximately `22.4%`.
- The recording-rule dependency is valid because rules in a group share an evaluation timestamp and dependent rules can consume earlier results in that group.
