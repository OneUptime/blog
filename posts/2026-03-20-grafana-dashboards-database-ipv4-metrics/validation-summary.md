# Validation Summary: How to Set Up Grafana Dashboards for Database IPv4 Connection Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana
- Prometheus
- PromQL
- PostgreSQL
- `postgres_exporter`
- MySQL
- `mysqld_exporter`

## Sources Consulted
- Prometheus query language basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus aggregation operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Grafana dashboard provisioning: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana alerting file provisioning: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- `postgres_exporter` repository: https://github.com/prometheus-community/postgres_exporter
- `postgres_exporter` `pg_stat_activity` metric mapping: https://github.com/prometheus-community/postgres_exporter/blob/master/exporter/postgres_exporter.go
- `postgres_exporter` `pg_stat_activity` query implementation: https://github.com/prometheus-community/postgres_exporter/blob/master/exporter/queries.go
- `mysqld_exporter` repository: https://github.com/prometheus/mysqld_exporter
- `mysqld_exporter` `information_schema.processlist` collector: https://github.com/prometheus/mysqld_exporter/blob/main/collector/info_schema_processlist.go

## Issues Found
- The post claimed `pg_stat_activity_count` could be grouped by `client_addr`, but the built-in `postgres_exporter` metric does not expose that label. I replaced the PostgreSQL examples with supported aggregations and added a note that per-client IP dashboards require custom SQL-based collection.
- The PostgreSQL sample panel and dashboard table examples relied on unsupported `client_addr` queries. I rewrote the actionable per-client IPv4 example to use MySQL’s `mysql_info_schema_processlist_processes_by_host` metric, which is exposed when `collect.info_schema.processlist` is enabled.
- The alert example was labeled as a Grafana alert provisioning snippet, but its structure matched Prometheus alerting rules instead. I corrected the description and aligned the example with a Prometheus rule using the MySQL per-host metric.
- The dashboard provisioning JSON example was too minimal and did not match current Grafana provisioning guidance. I wrapped it in Grafana’s documented dashboard provisioning structure and added basic dashboard metadata and panel layout fields.
- The JSON code blocks contained comments, which are not valid JSON. I removed the comments so the embedded JSON examples parse correctly.

## Review Notes
- `postgres_exporter` still has a deprecated `--extend.query-path` mechanism for custom queries, but the built-in `pg_stat_activity_count` metric is not a per-client-IP metric. PostgreSQL per-IP dashboards still require custom SQL collection outside the built-in metric set.
- `mysqld_exporter` exposes per-host process counts through `client_host`, which can contain hostnames as well as IP addresses. The revised examples filter to IPv4-looking values with a PromQL regex.
- Grafana-managed alert file provisioning uses a different schema from Prometheus rule files. The revised post now labels the sample correctly to avoid mixing the two formats.
- The embedded JSON and YAML snippets were syntax-checked after the edits.
