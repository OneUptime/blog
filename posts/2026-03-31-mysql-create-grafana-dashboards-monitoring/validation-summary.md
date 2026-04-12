# Validation Summary: How to Create Grafana Dashboards for MySQL Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Grafana (dashboards, alerting, HTTP API)
- Prometheus (PromQL)
- mysqld_exporter (Prometheus exporter for MySQL metrics)

## Sources Consulted
- Grafana HTTP API documentation for dashboard endpoints (`/api/dashboards/uid/<uid>`, `/api/dashboards/db`, `/api/dashboards/import`): https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Prometheus mysqld_exporter metric names: https://github.com/prometheus/mysqld_exporter
- Grafana community dashboard 7362 (MySQL Overview by Percona): https://grafana.com/grafana/dashboards/7362
- PromQL `rate()` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate

## Issues Found
1. **Incorrect dashboard re-import command (lines 117-121):** The original import command used `POST /api/dashboards/import` with `-d @mysql-dashboard.json`, sending the raw dashboard JSON directly. This is incorrect because: (a) the Grafana API expects the dashboard object to be wrapped in `{"dashboard": ..., "overwrite": true}`, and (b) `/api/dashboards/db` is the standard documented endpoint for creating/updating dashboards from JSON. The `/api/dashboards/import` endpoint is designed for importing community dashboards with datasource input mappings. Fixed by changing the command to pipe through `jq` to wrap the JSON and use the correct `/api/dashboards/db` endpoint.

## Review Notes
- All PromQL expressions use correct `mysqld_exporter` metric names (`mysql_global_status_questions`, `mysql_global_status_threads_connected`, `mysql_global_variables_max_connections`, `mysql_global_status_innodb_buffer_pool_read_requests`, `mysql_global_status_innodb_buffer_pool_reads`, `mysql_global_status_slow_queries`, `mysql_slave_status_seconds_behind_master`).
- The InnoDB buffer pool hit rate formula is mathematically correct: `read_requests / (read_requests + reads)`.
- The `mysql_slave_status_seconds_behind_master` metric uses legacy MySQL terminology ("slave"/"master"). MySQL 8.0.22+ deprecated these terms in favor of "replica"/"source", but the mysqld_exporter has retained the original metric names for backward compatibility.
- The post mentions adding "alert rules directly on panels," which reflects Grafana's legacy alerting (pre-v8). In Grafana 8+ with unified alerting, alert rules are managed through the Alerting section, though you can still create them from a panel context menu. The PromQL alert expression itself is correct regardless of the alerting method used.
- Dashboard ID 7362 is a valid and well-known Grafana community dashboard (MySQL Overview by Percona).
