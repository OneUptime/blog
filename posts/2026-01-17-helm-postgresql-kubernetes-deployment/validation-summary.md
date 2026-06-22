# Validation Summary: Deploying PostgreSQL on Kubernetes with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Helm
- Kubernetes
- Bitnami PostgreSQL Helm chart
- Bitnami PostgreSQL HA Helm chart
- PostgreSQL
- Pgpool-II
- PgBouncer
- Prometheus metrics / ServiceMonitor
- Kubernetes CronJob, Secrets, Services, PersistentVolumeClaims, and NetworkPolicy
- TLS certificates

## Sources Consulted
- Bitnami PostgreSQL Helm chart README: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/README.md
- Bitnami PostgreSQL Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/values.yaml
- Bitnami PostgreSQL HA Helm chart README: https://github.com/bitnami/charts/blob/main/bitnami/postgresql-ha/README.md
- Bitnami PostgreSQL HA Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql-ha/values.yaml
- Bitnami PgBouncer container README: https://github.com/bitnami/containers/blob/main/bitnami/pgbouncer/README.md
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- PostgreSQL documentation: https://www.postgresql.org/docs/current/

## Issues Found
- The `psql` connection example exported `POSTGRES_PASSWORD`, but `psql` reads `PGPASSWORD` for non-interactive password authentication. Updated the command to pass `PGPASSWORD="$POSTGRES_PASSWORD"`.
- The Bitnami PostgreSQL chart now uses `primary.pdb.*`, not `primary.podDisruptionBudget.*`. Updated the production values snippet.
- The production and HA snippets used `primary.configuration` to add a few settings. Bitnami documents `primary.configuration` as replacing the main config and `primary.extendedConfiguration` as the parameter for appending settings, so the snippets were changed to `extendedConfiguration`.
- The `pg_stat_statements` extension was created without preloading the library. Added `shared_preload_libraries = 'pg_stat_statements'` to the PostgreSQL settings.
- The network policy example used an outdated top-level shape with `ingressRules.primaryAccessOnlyFrom`. Updated it to the current `primary.networkPolicy` keys: `enabled`, `allowExternal`, and `ingressNSMatchLabels`.
- The PostgreSQL HA chart install command referenced the PostgreSQL chart values file instead of the HA chart values file. Updated it to use `postgresql-ha-advanced-values.yaml`.
- The Pgpool-II settings were placed in a raw `pgpool.configuration` block with Pgpool native key names. Updated them to the current chart values keys: `numInitChildren`, `maxPool`, `useConnectionCache`, `connectionLifeTime`, and `clientIdleLimit`.
- The backup section described VolumeSnapshots, but the Bitnami PostgreSQL `backup` values implement logical dump CronJobs. Renamed the section to logical backups and removed the snapshot-specific storage class comment.
- The PgBouncer section referenced a nonexistent `bitnami/pgbouncer` Helm chart and chart values. Replaced it with Bitnami PgBouncer container environment variables and Kubernetes commands that deploy, configure, and expose the container.
- The troubleshooting `kubectl run` example created the test pod outside the `database` namespace and did not pass a password to `psql`. Updated it to run in the `database` namespace with `PGPASSWORD`.

## Review Notes
- The guide is technically relevant and covers real deployment workflows, but production PostgreSQL on Kubernetes remains storage- and operations-sensitive. Future revisions could add version pinning for chart and image tags instead of `latest`, and could expand backup guidance to distinguish logical dumps, filesystem/PV backup, and point-in-time recovery.
