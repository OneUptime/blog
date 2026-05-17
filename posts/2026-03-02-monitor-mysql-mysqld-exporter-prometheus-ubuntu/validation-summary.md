# Validation Summary: How to Monitor MySQL with mysqld_exporter and Prometheus on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7+ and 8.0+)
- Prometheus mysqld_exporter (v0.15.1)
- Prometheus
- Grafana
- systemd
- Ubuntu
- PromQL
- MySQL Performance Schema

## Sources Consulted
- mysqld_exporter GitHub repository and release notes (https://github.com/prometheus/mysqld_exporter)
- mysqld_exporter v0.15.1 collector source for available `--collect.*` flags
- MySQL 8.0 Reference Manual: CREATE USER, GRANT, Performance Schema configuration (https://dev.mysql.com/doc/refman/8.0/en/)
- Prometheus configuration documentation (https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- Prometheus lifecycle API (https://prometheus.io/docs/prometheus/latest/management_api/)
- Grafana HTTP API documentation (https://grafana.com/docs/grafana/latest/developers/http_api/)
- Grafana dashboards catalog (dashboard ID 7362 "MySQL Overview")

## Issues Found
No technical issues found.

## Review Notes
- The mysqld_exporter version pinned (0.15.1) was the latest stable as of October 2023. As of mid-2026, newer releases may exist; readers should check the GitHub releases page before deploying. The instructions remain accurate for 0.15.1.
- The MySQL grants follow the official mysqld_exporter recommendation (`PROCESS, REPLICATION CLIENT, SELECT ON *.*` with `MAX_USER_CONNECTIONS 3`). The accompanying comment that this is "read-only" is accurate since none of these privileges allow modifying user data.
- `mysql_slave_status_*` metric names (including `seconds_behind_master`, `slave_sql_running`, `slave_io_running`) are correct — the exporter derives these from `SHOW SLAVE STATUS` columns. Note that MySQL 8.0.22+ deprecated `SHOW SLAVE STATUS` in favor of `SHOW REPLICA STATUS`, but mysqld_exporter still uses the legacy command for backward compatibility, so these metric names continue to work.
- `FLUSH PRIVILEGES` after `CREATE USER`/`GRANT` is not strictly required in modern MySQL (the grants take effect immediately) but is harmless.
- The Grafana `/api/dashboards/import` endpoint with the `gnetId`/`inputs` body format is valid for current Grafana versions; the manual import fallback provided is a robust alternative.
- All PromQL expressions are syntactically valid and the metric names align with what mysqld_exporter actually exports.
- The systemd unit, exporter flag set, credential file format (`.my.cnf` style), and file permissions (0400, dedicated user) all follow standard practice.
