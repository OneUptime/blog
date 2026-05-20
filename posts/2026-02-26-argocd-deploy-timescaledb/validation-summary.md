# Validation Summary: How to Deploy TimescaleDB with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD
- Kubernetes StatefulSets, Deployments, CronJobs, ConfigMaps, Secrets, PVCs, probes, and environment variables
- TimescaleDB / Tiger Data
- PostgreSQL configuration, authentication, `pg_dump`, and `pg_hba.conf`
- PgBouncer
- Prometheus PostgreSQL exporter
- AWS S3 backups

## Sources Consulted
- Timescale / Tiger Data Docker installation documentation: https://docs.timescale.com/self-hosted/latest/install/installation-docker/
- TimescaleDB compression API documentation: https://docs.timescale.com/api/latest/compression/alter_table_compression/
- TimescaleDB `create_hypertable()` API documentation: https://docs.timescale.com/api/latest/hypertable/create_hypertable/
- TimescaleDB continuous aggregate policy documentation: https://docs.timescale.com/api/latest/continuous-aggregates/add_continuous_aggregate_policy/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- PostgreSQL Docker official image documentation: https://hub.docker.com/_/postgres
- Bitnami PgBouncer container documentation: https://github.com/bitnami/containers/tree/main/bitnami/pgbouncer
- Kubernetes EnvVar API documentation: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#environment-variables

## Issues Found
- The post placed `timescaledb.compress_orderby` and `timescaledb.compress_segmentby` in `postgresql.conf`. These are TimescaleDB table reloptions configured with `ALTER TABLE`, not server configuration parameters. Removed them from the ConfigMap while keeping the valid `ALTER TABLE device_metrics SET (...)` compression configuration later in the post.
- The mounted `postgresql.conf` and `pg_hba.conf` files were not explicitly selected by the PostgreSQL process. Added startup arguments for `config_file` and `hba_file` so the mounted ConfigMap files are actually used.
- The TimescaleDB HA container data path was adjusted to match the documented Docker pattern using `/pgdata` and `PGDATA=/pgdata/...`; the separate WAL volume now uses `/pgwal` with `POSTGRES_INITDB_WALDIR`.
- The `pg_hba.conf` host authentication examples used `md5`. Updated them to `scram-sha-256`, which is the current preferred PostgreSQL password authentication method for new deployments.
- The PostgreSQL exporter referenced `$(POSTGRES_PASSWORD)` before the variable was defined in the container environment list. Reordered the variables so Kubernetes can expand the value from a previously defined environment variable.
- The PgBouncer example did not explicitly configure the backend user/database or the advertised PgBouncer database. Added `POSTGRESQL_USERNAME`, `POSTGRESQL_DATABASE`, and `PGBOUNCER_DATABASE` for the `metrics` database created by the schema hook.
- The text described a pre-sync hook, but the manifest correctly used `argocd.argoproj.io/hook: PostSync`. Updated the text to say post-sync and explain that the schema runs after the database is healthy.
- The `create_hypertable()` example used the older positional API. Updated it to the current dimension-builder form with `by_range('time', INTERVAL '1 day')`.
- The backup CronJob used the TimescaleDB image while also invoking `aws s3 cp`; that image is not documented as an AWS CLI image. Updated the example to use a backup image that includes both PostgreSQL client tools and AWS CLI.

## Review Notes
- The snippets remain illustrative and still require production-specific resources not shown in the post, including the Secret, Services, IAM or AWS credentials, storage classes, and a real backup image published by the reader's organization.
- Running PostgreSQL or TimescaleDB directly on Kubernetes is operationally sensitive. A production deployment should also consider automated failover, restore testing, TLS, PodDisruptionBudgets, network policies, and an operator or managed database option.
