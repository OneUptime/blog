# Validation Summary: How to Implement Infrastructure Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus alerting and recording rules
- Prometheus Node Exporter
- cAdvisor
- Docker Compose
- systemd
- Linux infrastructure metrics
- USE Method

## Sources Consulted
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Node Exporter GitHub documentation and v1.9.1 `--help`: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter releases: https://github.com/prometheus/node_exporter/releases
- cAdvisor running documentation: https://github.com/google/cadvisor/blob/master/docs/running.md
- cAdvisor runtime options documentation: https://github.com/google/cadvisor/blob/master/docs/runtime_options.md
- cAdvisor releases: https://github.com/google/cadvisor/releases
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Brendan Gregg's USE Method: https://www.brendangregg.com/usemethod.html

## Issues Found
- Updated the Node Exporter installation example from `v1.7.0` to `v1.9.1`, matching the current official Node Exporter release checked during review.
- Updated the cAdvisor image from the older `gcr.io/cadvisor/cadvisor:v0.47.0` image to `ghcr.io/google/cadvisor:v0.57.0`, matching current cAdvisor release and registry guidance.
- Removed the obsolete Docker Compose `version: '3.8'` top-level field from the cAdvisor Compose example.
- Changed the cAdvisor `/var/run` mount from read-only to read-write to align with the official cAdvisor Docker run documentation.
- Removed `disk` and `diskIO` from the cAdvisor `--disable_metrics` list because the post later queries `container_fs_*` disk I/O metrics.
- Fixed the cAdvisor Prometheus `metric_relabel_configs` example. The original Kubernetes pod-name filter would drop Docker container metrics in the shown Docker-host setup; it now drops only series without a `name` label.
- Fixed the CPU saturation PromQL query and alert by using `count without (cpu, mode)` so the CPU count series can match `node_load1` labels correctly.
- Reworded the CPU "Errors" example because context switches are scheduler activity, not CPU errors.
- Corrected disk saturation PromQL to use `rate(node_disk_io_time_weighted_seconds_total[5m])` as the average number of I/Os in progress.
- Replaced the incorrect disk "failed read/write operations" query with an average disk read latency query, since `node_disk_read_time_seconds_total` is timing data, not an error counter.
- Reworded the container CPU query and alert from "percentage of allocated CPU / CPU limit" to "percentage of one CPU core" because the expression does not divide by container CPU limits.
- Replaced the invalid `prometheus.yml` retention example with supported Prometheus startup flags: `--storage.tsdb.retention.time` and `--storage.tsdb.retention.size`.

## Review Notes
- `promtool` v3.5.0 validated the corrected Prometheus scrape config and alerting rules.
- Docker Compose v5.1.3 validated the corrected cAdvisor Compose snippet.
- Container memory percentage examples still assume containers have meaningful memory limits. In environments with unlimited or very large limits, alert thresholds should be adapted to local policy.
