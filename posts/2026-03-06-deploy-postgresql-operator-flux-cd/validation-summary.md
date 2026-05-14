# Validation Summary: How to Deploy PostgreSQL Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- CloudNativePG
- PostgreSQL
- Kubernetes
- Helm
- Kustomize
- Prometheus Operator PodMonitor
- PgBouncer
- S3-compatible object storage backups

## Sources Consulted
- CloudNativePG 1.29 backup documentation: https://cloudnative-pg.io/docs/1.29/backup/
- CloudNativePG 1.29 monitoring documentation: https://cloudnative-pg.io/docs/1.29/monitoring/
- CloudNativePG 1.29 bootstrap documentation: https://cloudnative-pg.io/docs/1.29/bootstrap/
- CloudNativePG 1.29 security documentation: https://cloudnative-pg.io/docs/1.29/security/
- CloudNativePG Helm chart repository index: https://cloudnative-pg.github.io/charts/index.yaml
- CloudNativePG Helm chart values: https://github.com/cloudnative-pg/charts/blob/main/charts/cloudnative-pg/values.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- PostgreSQL 16 pg_stat_statements documentation: https://www.postgresql.org/docs/16/pgstatstatements.html

## Issues Found
- The prerequisites listed Kubernetes v1.25 or later, but the current CloudNativePG Helm chart line used by the post requires Kubernetes v1.29 or later. Updated the prerequisite to v1.29 or later.
- The CloudNativePG Helm chart version was pinned to the older `0.21.x` series. Updated it to `0.28.x`, matching the current chart series available from the official CloudNativePG chart repository.
- The repository structure omitted files later used by the tutorial. Added `credentials.yaml`, `monitoring.yaml`, `pooler.yaml`, and the Flux `postgresql-kustomization.yaml` entry to the structure.
- The backup configuration referenced `pg-s3-credentials`, but the tutorial did not define that Secret. Added an example S3 credentials Secret to `credentials.yaml`.
- The post created the `pg_stat_statements` extension without setting `shared_preload_libraries`. Added `shared_preload_libraries: "pg_stat_statements"` to the PostgreSQL parameters.
- The post configured and used a PostgreSQL superuser Secret, then verified with `psql -U postgres`, but CloudNativePG disables password access for the `postgres` superuser by default. Added `enableSuperuserAccess: true`.
- The scheduled backup used a five-field Unix cron expression. CloudNativePG `ScheduledBackup` uses a six-field cron expression with seconds, so the schedule was changed to `0 0 2 * * *` for 02:00 UTC.
- The comment above `backupOwnerReference` incorrectly described it as a backup type. Updated the comment to describe owner references for generated `Backup` resources.
- The cluster manifest used deprecated automatic `PodMonitor` creation via `spec.monitoring.enablePodMonitor`. Removed that field and added an explicit `PodMonitor` resource in `monitoring.yaml`.
- The verification commands exec'd into `pg-cluster-1` while describing it as the primary. In CloudNativePG the primary can change, so the commands now exec through `svc/pg-cluster-rw`, which selects the current read-write instance.

## Review Notes
- The post still uses CloudNativePG's native `barmanObjectStore` backup method. This remains supported and is the default for backward compatibility, but CloudNativePG 1.29 documents it as deprecated from version 1.26 in favor of the Barman Cloud Plugin.
- The `PodMonitor` resource requires Prometheus Operator CRDs to be installed in the cluster.
