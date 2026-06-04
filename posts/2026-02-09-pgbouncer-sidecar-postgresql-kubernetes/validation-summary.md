# Validation Summary: How to Use Connection Pooling with PgBouncer Sidecar

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- PgBouncer
- Kubernetes StatefulSets, Deployments, Services, ConfigMaps, and Secrets
- Prometheus PgBouncer exporter
- Prometheus Operator ServiceMonitor
- Grafana / PromQL
- Python psycopg2

## Sources Consulted
- PgBouncer configuration documentation: https://www.pgbouncer.org/config
- PgBouncer usage and SHOW command documentation: https://www.pgbouncer.org/usage
- prometheus-community PgBouncer exporter README and source: https://github.com/prometheus-community/pgbouncer_exporter
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Prometheus Operator ServiceMonitor API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post claimed applications can use prepared statements in transaction pooling without issues. PgBouncer only supports protocol-level named prepared statements in transaction or statement pooling when `max_prepared_statements` is non-zero, and SQL-level prepared statement commands are not handled the same way. I updated the explanation and added `max_prepared_statements = 100` to the sample config.
- The PgBouncer `userlist.txt` example embedded a shell command inside a ConfigMap. Kubernetes stores ConfigMap data literally, so the command would not run and PgBouncer would receive an invalid password string. I replaced it with a plain password entry matching the Secret example.
- The secret creation command ran before the `database` namespace was created. I reordered the commands so the namespace exists first.
- PgBouncer admin console access was demonstrated, but the config did not set `admin_users` or `stats_users`. PgBouncer defaults these to empty, so `SHOW` commands through the console would not work for `postgres`. I added both settings.
- The application Deployment in the `default` namespace referenced a Secret created in the `database` namespace. Kubernetes Secret references are namespace-local. I added a note requiring a matching application namespace Secret or an existing credential Secret.
- The pooling parameter examples used trailing inline comments in PgBouncer INI values. I moved those comments to separate lines to avoid values being parsed incorrectly.
- The exporter Deployment used `PGBOUNCER_HOST`, `PGBOUNCER_PORT`, `PGBOUNCER_USER`, and `PGBOUNCER_PASS`, but the prometheus-community exporter documents the `PGBOUNCER_EXPORTER_CONNECTION_STRING` environment variable. I replaced the environment variables with the documented connection string.
- The ServiceMonitor selected a port named `http-metrics`, but the exporter Service did not name its port. I added the matching Service port name.
- The PromQL examples referenced non-existent or incorrect metric names from the prometheus-community exporter, and the pool utilization expression divided active server connections by idle server connections instead of total available active plus idle connections. I corrected the client wait time metric, adjusted pool utilization, and replaced the saturation expression with the exported `pgbouncer_pools_client_maxwait_seconds` metric.
- The write-heavy workload note recommended session pooling as though write-heavy traffic requires it. I changed the note to session-level features, which is the actual reason to prefer session pooling.
- The Python example was described as a circuit breaker, but it implements retry handling around a client-side connection pool. I corrected the heading.

## Review Notes
The examples still use a plain password in a ConfigMap and in the exporter connection string for simplicity. This is functional but not ideal for production; a future revision should mount PgBouncer authentication data from a Secret and source the exporter connection string from a Secret.
