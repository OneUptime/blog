# Validation Summary: Calculate Per-Host CPU from `node_cpu_seconds_total` Correctly

## Status

validated

## Post Type

Technical guide / PromQL tutorial

## Technologies Covered

- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus Node Exporter
- Linux `/proc/stat` CPU accounting
- Infrastructure monitoring and alerting

## Sources Consulted

- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — `rate()` and `irate()` behavior, counter-reset adjustment, boundary extrapolation, and the requirement to calculate rates before aggregation.
- [Prometheus operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — aggregation syntax and the label behavior of `by` and `without`.
- [Prometheus recording-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) — rule-file YAML structure, recording-rule fields, and metric-name requirements.
- [Prometheus recording-rule best practices](https://prometheus.io/docs/practices/rules/) — the `level:metric:operations` naming convention and the requirement for the aggregation level to represent output labels.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/) — automatic attachment and meaning of the `job` and `instance` target labels.
- [Prometheus getting started guide](https://prometheus.io/docs/prometheus/latest/getting_started/) — the official `node_cpu_seconds_total` rate-and-aggregation example.
- [Prometheus Node Exporter repository and container guidance](https://github.com/prometheus/node_exporter) — CPU collector availability and host namespace/root-filesystem requirements for containerized host monitoring.
- [Node Exporter Linux CPU collector source](https://github.com/prometheus/node_exporter/blob/master/collector/cpu_linux.go) — exported CPU modes, default guest metric behavior, guest accounting, hot-plug handling, and removal of offline CPUs.
- [Node Exporter changelog](https://github.com/prometheus/node_exporter/blob/master/CHANGELOG.md) — current metric naming and Linux guest metric separation.
- [Linux kernel `/proc/stat` documentation](https://docs.kernel.org/filesystems/proc.html) — CPU accounting fields, units, since-boot semantics, and documented `iowait` limitations.
- [Prometheus 3.13.1 release](https://github.com/prometheus/prometheus/releases/tag/v3.13.1) — current stable `promtool` used to parse the complete PromQL and recording-rule examples.

## Issues Found

1. **Incorrect label provenance** — The metric-shape section implied that Node Exporter exposes `job` and `instance`. Node Exporter supplies `cpu` and `mode`, while Prometheus normally attaches `job` and `instance` during scraping. Updated the explanation to distinguish exporter labels from scrape target labels.
2. **Non-idle accounting described as active CPU consumption** — The post equated a normalized non-idle share with “fully busy” CPUs and later called an unnormalized sum “cores consumed.” Because `1 - idle` and `mode!="idle"` include `iowait` and steal, those descriptions can overstate useful execution. Reworded the examples as core-equivalents of non-idle accounting and as non-idle CPU-seconds per second, with an explicit reminder to select modes when measuring execution.
3. **Recording-rule aggregation level omitted a preserved label** — The rule retained both `job` and `instance` but was named with the `instance:` level. Prometheus naming guidance says that the level should represent the output labels. Renamed the rule to `job_instance:node_cpu_non_idle:ratio_rate5m`, updated its use, and clarified that additional identity labels should be reflected in the rule-name level.

## Review Notes

- The primary query correctly applies `rate()` to each counter before averaging and preserves a separate result for each selected host identity.
- The post correctly distinguishes a normalized per-host share from a CPU-count-weighted fleet capacity calculation.
- Guest CPU time is correctly excluded from the `node_cpu_seconds_total` mode sum because Node Exporter exposes it separately and documents that it is already accounted in user and nice time.
- The `iowait`, steal, missing-series, hot-plug, and containerized Node Exporter caveats match the current Linux kernel and Node Exporter documentation.
- All complete PromQL expressions intended to run, plus the recording-rule YAML, parse successfully with Prometheus `promtool` 3.13.1. The aggregation-before-`rate()` expression is intentionally invalid as written and is correctly identified in the post as requiring subquery syntax while remaining semantically unsafe for reset detection.
- No deprecated APIs or version-specific obsolete instructions remain.
