# Validation Summary: Which Infrastructure Metrics Actually Deserve Alerts? A Practical Selection Framework

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus alerting rules and alert design
- PromQL boolean precedence, vector matching, and rule testing
- Prometheus metamonitoring and the `up` metric
- Prometheus Node Exporter collectors
- Linux CPU, memory, filesystem, disk I/O, network, and load metrics
- Linux Pressure Stall Information (PSI)
- Linux cgroup memory limits and OOM behavior
- Google SRE golden signals, SLOs, and error-budget burn rates

## Sources Consulted

- [Google SRE: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Prometheus: Alerting Practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus: The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/)
- [Prometheus: Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus: Jobs and Instances](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus: Querying Operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus: Unit Testing for Rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
- [Prometheus: Recording Rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus Node Exporter](https://github.com/prometheus/node_exporter)
- [Linux Kernel: Pressure Stall Information](https://docs.kernel.org/accounting/psi.html)
- [Linux Kernel: The `/proc` Filesystem](https://docs.kernel.org/filesystems/proc.html)
- [Linux Kernel: Control Group v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)
- [Linux `proc_loadavg(5)` manual page](https://man7.org/linux/man-pages/man5/proc_loadavg.5.html)

## Issues Found

No technical issues found.

## Review Notes

- The five fenced `text` blocks are conceptual conditions, a lead-time formula, and a checklist rather than executable PromQL, commands, or configuration. PromQL implementations must supply concrete metrics and label matching appropriate to the deployment.
- The warning about PromQL boolean precedence and vector matching is accurate: `and` has higher precedence than `or`, and operations between instant vectors depend on matching label sets unless matching behavior is specified.
- The alert thresholds are intentionally workload- and response-time-specific. The post correctly avoids presenting universal CPU, memory, filesystem, hardware, or temperature thresholds.
- All seven external links present in the post returned HTTP 200 during validation.
