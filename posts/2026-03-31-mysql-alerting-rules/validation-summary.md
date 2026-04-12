# Validation Summary: How to Set Up MySQL Alerting Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL
- Prometheus (alerting rules, PromQL)
- mysqld_exporter (Prometheus MySQL Exporter)
- Alertmanager
- systemd (systemctl)

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus mysqld_exporter metric names: https://github.com/prometheus/mysqld_exporter
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus lifecycle API (/-/reload endpoint): https://prometheus.io/docs/prometheus/latest/management_api/

## Issues Found
1. **Alertmanager config structure incorrect**: The `routes:` key was shown at the top level of the YAML snippet, but Alertmanager requires `routes` to be nested under the top-level `route:` key. A bare `routes:` at the top level is not valid Alertmanager configuration and would cause a parse error on startup. Fixed by wrapping the `routes` list inside a `route:` parent key with proper indentation.

## Review Notes
- The `curl -X POST http://localhost:9090/-/reload` endpoint requires the `--web.enable-lifecycle` flag to be enabled on the Prometheus server. The post does not mention this prerequisite, but the primary reload method shown (`systemctl reload`) does not have this requirement, so this is a minor omission.
- The metric name `mysql_slave_status_seconds_behind_master` uses the older "slave" terminology from mysqld_exporter. Newer versions of mysqld_exporter may also expose `mysql_slave_status_seconds_behind_master` under this name for backward compatibility, but users on very recent MySQL 8.x+ setups should be aware that the underlying MySQL status variable has been renamed to `Replica_*` terminology. The exporter still uses the `slave` naming convention.
- All PromQL expressions are syntactically correct and use valid metric names from the standard mysqld_exporter.
- The `for` durations and threshold values are reasonable defaults for production alerting.
