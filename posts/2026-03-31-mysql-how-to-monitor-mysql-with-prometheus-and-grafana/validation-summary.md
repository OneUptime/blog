# Validation Summary: How to Monitor MySQL with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Prometheus (time-series monitoring)
- Grafana (dashboarding and visualization)
- mysqld_exporter (Prometheus exporter for MySQL metrics)
- systemd (service management)
- PromQL (Prometheus query language for alert rules)

## Sources Consulted
- Prometheus mysqld_exporter GitHub repository and README (https://github.com/prometheus/mysqld_exporter)
- mysqld_exporter v0.15.1 release and collector documentation
- Prometheus configuration documentation (https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- Prometheus alerting rules documentation (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- MySQL GRANT statement documentation (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- Grafana dashboard import documentation (https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/import-dashboards/)
- Grafana dashboard registry for IDs 7362 and 11323

## Issues Found
1. **Invalid collector flag `--collect.perf_schema.replication_status`**: This is not a valid mysqld_exporter collector. The `perf_schema` namespace includes collectors like `replication_group_members`, `replication_group_member_stats`, and `replication_applier_status_by_worker` (all for Group Replication), but there is no `replication_status` collector. Since the post references the metric `mysql_slave_status_seconds_behind_master` in the "Key Metrics to Monitor" section (which comes from traditional replication via `SHOW SLAVE STATUS`), the flag was changed to `--collect.slave_status`, which is the correct collector for traditional MySQL replication metrics.

## Review Notes
- The `GRANT SELECT ON performance_schema.*` statement is technically redundant since `SELECT ON *.*` was already granted on the line above. This is a common documentation pattern for clarity and does not cause errors, so it was left as-is.
- The Prometheus reload command (`curl -X POST http://localhost:9090/-/reload`) requires Prometheus to be started with the `--web.enable-lifecycle` flag. The post does not mention this prerequisite, which could cause confusion for readers. This is an omission rather than an error in the command itself.
- The metric name `mysql_slave_status_seconds_behind_master` uses the legacy "slave" terminology. In newer versions of mysqld_exporter, this may also be exposed as `mysql_slave_status_seconds_behind_master` for backward compatibility, but readers using MySQL 8.0.22+ with the newer `SHOW REPLICA STATUS` syntax should be aware of potential metric name changes in future exporter versions.
- Dashboard IDs 7362 (Percona MySQL Overview) and 11323 (MySQL Exporter Full) are valid and well-known Grafana community dashboards.
- All PromQL alert expressions are syntactically correct and use appropriate metric names.
