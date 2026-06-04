# Validation Summary: How to Implement Database Monitoring with Prometheus Exporters on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes StatefulSets, Deployments, Services, Secrets, ConfigMaps, lifecycle hooks, and init containers
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Prometheus alerting rules and PromQL
- PostgreSQL and prometheus-community postgres_exporter
- MySQL and prometheus mysqld_exporter
- MongoDB and Percona mongodb_exporter
- Redis and oliver006 redis_exporter

## Sources Consulted
- Kubernetes documentation: Define Dependent Environment Variables, https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes documentation: Init Containers, https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Prometheus Operator API reference, https://prometheus-operator.dev/docs/api-reference/api/
- prometheus-community postgres_exporter README and v0.15.0 image help, https://github.com/prometheus-community/postgres_exporter
- prometheus mysqld_exporter README and v0.15.1 image help, https://github.com/prometheus/mysqld_exporter
- Percona mongodb_exporter README and 0.40 image help, https://github.com/percona/mongodb_exporter
- oliver006 redis_exporter README and v1.55.0 image help, https://github.com/oliver006/redis_exporter
- Prometheus promtool rule checker using prom/prometheus:v2.55.1, https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- The description mentioned Grafana dashboards, but the post does not include any Grafana dashboard configuration. Changed it to reference verification steps instead.
- The ServiceMonitor examples selected Services, but the database manifests did not create Services with named `metrics` ports. Added Services for PostgreSQL, MySQL, MongoDB, and Redis so the ServiceMonitor selectors and endpoint port names resolve.
- The PostgreSQL exporter used a password-bearing `DATA_SOURCE_NAME` with Kubernetes variable references. Replaced it with `DATA_SOURCE_URI`, `DATA_SOURCE_USER`, and `DATA_SOURCE_PASS`, matching the exporter configuration options and avoiding unresolved env-var ordering issues.
- The PostgreSQL table-size custom query passed an unquoted text concatenation to `pg_total_relation_size`. Changed it to `format('%I.%I', schemaname, tablename)::regclass` so identifiers are quoted correctly and the function receives a `regclass`.
- The PostgreSQL replication lag custom query could return null on a primary. Changed it to return `0` when not in recovery and to coalesce standby timestamp lag.
- The PostgreSQL custom replication query name would have produced `pg_replication_lag_lag_seconds`, while the alert used `pg_replication_lag_seconds`. Renamed the query to `pg_replication` so the custom metric name matches the alert.
- The MySQL exporter user was created in an initContainer that tried to connect to `localhost` before the MySQL app container existed. Replaced it with a MySQL container `postStart` hook that waits for MySQL and creates/grants the exporter user after startup.
- The MySQL exporter used `DATA_SOURCE_NAME`, which is not the current configuration style for the referenced exporter. Replaced it with `MYSQLD_EXPORTER_PASSWORD`, `--mysqld.address`, and `--mysqld.username`.
- The MongoDB exporter used non-documented `MONGO_USER` and `MONGO_PASSWORD` env var names. Changed them to `MONGODB_USER` and `MONGODB_PASSWORD`, and set `MONGODB_URI` to the admin database.
- The Redis exporter address omitted the documented URI scheme. Changed `localhost:6379` to `redis://localhost:6379`.
- The Redis high-memory alert divided by `redis_memory_max_bytes` without checking for `0`, which is common when Redis has no maxmemory limit. Added a positive max-memory guard to avoid false alerts.

## Review Notes
- All fenced YAML snippets parse successfully with PyYAML.
- The PrometheusRule expressions passed `promtool check rules` after extracting `spec.groups` from the Prometheus Operator CRD.
- A live Kubernetes API server was not available, so CRD admission validation was not performed.
