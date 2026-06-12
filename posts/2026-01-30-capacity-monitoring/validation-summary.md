# Validation Summary: How to Build Capacity Monitoring

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Prometheus and PromQL
- Prometheus Node Exporter
- Alertmanager
- Grafana dashboard JSON
- Docker Compose
- Kubernetes Horizontal Pod Autoscaler
- Python capacity planning scripts
- Linux CPU, memory, disk, and network capacity metrics

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter
- Docker Compose file reference for obsolete top-level version: https://docs.docker.com/reference/compose-file/version-and-name/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- Load average was described only as processes waiting for CPU. Updated it to include runnable and uninterruptible tasks, which better matches Linux load semantics.
- The swap usage PromQL divided by zero on hosts without swap. Added an `and on(instance) node_memory_SwapTotal_bytes > 0` guard in both the query and alert rule.
- The disk exhaustion query comment incorrectly said the expression returned seconds until full. Corrected the comment to state that it returns true when available space is predicted to go below zero within seven days.
- The disk capacity report treated `0` days as false and printed `N/A (shrinking)` when a threshold was already reached. Changed the formatting checks to test `is not None`.
- `node_sockstat_TCP_tw` was described as socket saturation/time waiting. Corrected it to TCP sockets in `TIME_WAIT`.
- The Docker Compose example used the obsolete top-level `version` key, old pinned image tags, and a Node Exporter container setup that would not reliably collect host network metrics. Removed `version`, switched example images to current tags, and aligned Node Exporter with the official host-monitoring container pattern using host networking, host PID namespace, `--path.rootfs`, and an `rslave` host mount.
- The Prometheus config referenced `/etc/prometheus/rules/*.yml` and `alertmanager:9093`, but the Compose stack did not mount a rules directory or run Alertmanager. Added the rules mount and an Alertmanager service, and updated the local Node Exporter scrape target to `host.docker.internal:9100` to match host networking.
- The baseline CPU percentile query used `histogram_quantile` on `node_cpu_seconds_total`, which is a counter, not a histogram bucket metric. Replaced it with `quantile_over_time` over a CPU utilization subquery.
- The troubleshooting query for high system time divided system CPU by the matching `mode="system"` denominator, effectively producing an incorrect ratio. Rewrote it to divide summed system time by summed total CPU time per instance.
- The interrupt handling query returned raw per-CPU rates rather than a per-instance percentage. Rewrote it as a summed per-instance percentage.
- The disk queue-size query divided weighted I/O time by busy time, which describes queue depth while busy rather than average queue length over wall time. Changed it to `rate(node_disk_io_time_weighted_seconds_total[5m])`.

## Review Notes
- Validation performed with local parsing for Python, YAML, and JSON snippets; Docker Compose config validation; and Prometheus `promtool` checks for the Prometheus config, alert rules, and PromQL expressions.
- Some thresholds remain intentionally illustrative. Production thresholds should still be tuned from service baselines, workload behavior, and infrastructure limits.
