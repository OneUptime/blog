# Validation Summary: How to Create Custom Grafana Dashboards for RHEL System Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux system metrics
- Grafana dashboards and variables
- Prometheus and PromQL
- Prometheus node_exporter metrics
- Linux disk I/O statistics
- curl and JSON formatting with Python

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana Dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Prometheus node_exporter documentation: https://github.com/prometheus/node_exporter
- Linux kernel I/O statistics documentation: https://kernel.googlesource.com/pub/scm/linux/kernel/git/stable/linux/+/refs/heads/linux-6.16.y/Documentation/admin-guide/iostats.rst

## Issues Found
- The disk latency PromQL used `rate(node_disk_io_time_weighted_seconds_total[5m]) / rate(node_disk_io_time_seconds_total[5m]) * 1000` and described it as average wait time. Linux diskstats defines weighted I/O time as queue-depth-weighted elapsed time, not as elapsed time per completed operation. I changed the query to divide the rate of read/write elapsed time by the rate of completed read/write operations, then multiply by 1000 to report milliseconds per operation.

## Review Notes
- The Grafana variable query uses the classic `label_values(metric, label)` syntax, which Grafana documents as deprecated in the variable query editor, but it remains a documented compatibility syntax. A future update could use the newer query-type UI fields instead.
- The example Grafana API command correctly uses the dashboard UID endpoint, but it exports the API response wrapper containing dashboard metadata as well as the dashboard model.
