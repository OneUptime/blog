# Validation Summary: How to Implement Database Blue-Green with ArgoCD

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Argo CD resource hooks and GitOps sync behavior
- Kubernetes Services and ConfigMaps
- CloudNativePG PostgreSQL clusters, recovery, services, and monitoring
- PostgreSQL 16 logical replication
- Prometheus Operator PrometheusRule alerts

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/resource_hooks/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- CloudNativePG recovery documentation: https://cloudnative-pg.io/docs/1.26/recovery/
- CloudNativePG bootstrap documentation: https://cloudnative-pg.io/docs/1.28/bootstrap/
- CloudNativePG API reference: https://cloudnative-pg.io/docs/1.26/cloudnative-pg.v1
- CloudNativePG monitoring documentation: https://cloudnative-pg.io/docs/1.25/monitoring/
- CloudNativePG service management documentation: https://cloudnative-pg.io/docs/devel/service_management/
- PostgreSQL 16 logical replication documentation: https://www.postgresql.org/docs/16/logical-replication.html
- PostgreSQL 16 CREATE PUBLICATION documentation: https://www.postgresql.org/docs/16/sql-createpublication.html
- PostgreSQL 16 CREATE SUBSCRIPTION documentation: https://www.postgresql.org/docs/16/sql-createsubscription.html
- PostgreSQL 16 logical replication security documentation: https://www.postgresql.org/docs/16/logical-replication-security.html
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The migration text said to use a PreSync hook, but the YAML used `argocd.argoproj.io/hook: PostSync`. Updated the text to say PostSync because the green database must already exist before this migration job runs.
- The CloudNativePG recovery example used a fixed `recoveryTarget.targetTime` while describing recovery to the latest consistent point. Removed the fixed target and clarified that omitting `recoveryTarget` replays through the latest available WAL.
- The CloudNativePG example used native `barmanObjectStore` fields that are deprecated in current CloudNativePG guidance. Updated the example to reference the Barman Cloud Plugin path and noted that the ObjectStore resource is not shown.
- The `monitoring.enablePodMonitor` field is deprecated in current CloudNativePG documentation. Removed it from the cluster manifest.
- The logical replication example omitted critical requirements: `wal_level = logical`, replication privileges, schema compatibility, and the risk of missing writes when using `copy_data = false` after restoring from a backup. Added a caution explaining when `copy_data = false` is safe and what to use otherwise.
- The verification job described `pg_stat_user_tables.n_live_tup` as row counts. Updated the wording to "approximate row counts" because PostgreSQL statistics are estimates.
- The service switch text described updating service endpoints, but an `ExternalName` Service is a DNS alias, not endpoint management. Updated the wording.
- The post said Argo CD syncing a ConfigMap causes application pods to restart. Corrected this to state that pods use the new value after a rollout, checksum annotation change, or reloader controller restart.
- The rollback section and summary overstated rollback as instant and data-safe. Updated them to distinguish quick traffic rollback from data-safe rollback after green has accepted writes.
- The cleanup Job omitted the namespace and environment variables used by its command. Added `namespace: database` and `GREEN_USER` / `GREEN_PASSWORD` env definitions.
- The Prometheus example used `pg_replication_lag`, which is not the CloudNativePG metric name. Updated it to `cnpg_pg_replication_lag`.

## Review Notes
The post is technically relevant and salvageable. The remaining examples are still illustrative and require environment-specific details such as the actual Barman Cloud Plugin ObjectStore, secrets, PostgreSQL roles, rollout mechanism, and application-specific migration tooling.
