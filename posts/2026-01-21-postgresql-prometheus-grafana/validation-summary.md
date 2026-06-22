# Validation Summary: How to Monitor PostgreSQL with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / monitoring setup guide

## Technologies Covered
- PostgreSQL
- Prometheus
- prometheus-community postgres_exporter
- Grafana
- PromQL
- systemd
- Kubernetes service discovery

## Sources Consulted
- postgres_exporter README and flags: https://github.com/prometheus-community/postgres_exporter
- postgres_exporter latest release API: https://api.github.com/repos/prometheus-community/postgres_exporter/releases/latest
- postgres_exporter current collectors/source for metric names: https://github.com/prometheus-community/postgres_exporter/tree/master/collector
- PostgreSQL predefined roles: https://www.postgresql.org/docs/current/predefined-roles.html
- PostgreSQL pg_stat_statements: https://www.postgresql.org/docs/current/pgstatstatements.html
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana panel-linked alert documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/link-alert-rules-to-panels/
- Grafana dashboard 9628 page: https://grafana.com/grafana/dashboards/9628-postgresql-database/

## Issues Found
- The post said to download the latest postgres_exporter release but used v0.15.0. Updated the commands to v0.19.1, the latest release returned by the official GitHub releases API on 2026-06-21.
- The systemd service used `User=postgres_exporter` and `Group=postgres_exporter` without creating an operating-system user. Added a `useradd --system` command before the service example.
- The PostgreSQL password in the database user example did not match the datasource examples. Updated the datasource examples to use `secure_password` consistently.
- The datasource file example wrote a URI to `/etc/postgres_exporter/datasource`, but postgres_exporter does not read that file automatically. Replaced it with supported `DATA_SOURCE_URI_FILE`, `DATA_SOURCE_USER`, and `DATA_SOURCE_PASS` environment variables.
- The `pg_stat_statements` grant assumed the extension object existed. Added `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` before granting access.
- The architecture diagram used "Alert Manager"; corrected it to the official Prometheus component name "Alertmanager."
- The connection utilization and connection alert PromQL compared `pg_stat_activity_count` directly with `pg_settings_max_connections`, which would not correctly aggregate per-state/per-database connection series. Updated those expressions to aggregate `pg_stat_activity_count` and compare it to the max-connection setting by instance.
- The replication metrics section listed `pg_replication_lag_bytes` and `pg_wal_position_diff`, which are not current postgres_exporter default metric names. Replaced them with `pg_stat_replication_pg_wal_lsn_diff` and `pg_stat_replication_pg_current_wal_lsn_bytes`.
- The XID wraparound alert used non-existent metric `pg_database_age`. Updated it to `pg_database_wraparound_age_datfrozenxid_seconds` and enabled the `database_wraparound` collector in the exporter run/systemd examples.
- The custom `pg_locks` query would emit `pg_locks_count`, colliding with the exporter built-in locks collector. Renamed the custom query prefix to `custom_pg_locks`.

## Review Notes
The `--extend.query-path` flag is still available but deprecated in postgres_exporter; the post now remains technically valid, but future revisions should prefer built-in collectors where possible and use custom SQL only for metrics not covered by the exporter.
