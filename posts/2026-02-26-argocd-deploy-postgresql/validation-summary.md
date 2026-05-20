# Validation Summary: How to Deploy PostgreSQL with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- ArgoCD Applications, sync options, hooks, and sync waves
- Kubernetes Deployments, Services, PVCs, Secrets, Jobs, CronJobs, and ConfigMaps
- PostgreSQL on Kubernetes
- Bitnami PostgreSQL Helm chart
- CloudNativePG operator, Cluster, and ScheduledBackup resources
- Prometheus postgres-exporter
- PgBouncer
- S3 backup workflows

## Sources Consulted
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Docker Postgres official image documentation: https://www.docker.com/blog/how-to-use-the-postgres-docker-official-image/
- PostgreSQL 16 pg_dump documentation: https://www.postgresql.org/docs/16/app-pgdump.html
- Bitnami PostgreSQL Helm chart documentation: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/README.md
- CloudNativePG backup documentation: https://cloudnative-pg.io/docs/1.26/backup/
- CloudNativePG API reference: https://cloudnative-pg.io/docs/1.28/cloudnative-pg.v1/
- Prometheus postgres_exporter documentation: https://github.com/prometheus-community/postgres_exporter
- edoburu PgBouncer image documentation: https://github.com/edoburu/docker-pgbouncer

## Issues Found
- The PVC protection example only used `Prune=false`. Added `Delete=false` as well, because Argo CD documents `Delete=false` as the sync option for retaining resources such as PVCs when an Application is deleted.
- The explanation for `PrunePropagationPolicy=orphan` incorrectly implied it generally keeps PVCs. Reworded it to describe Kubernetes orphan propagation for pruned owner resources, and added a separate note for PVC-level `Prune=false,Delete=false`.
- The ReadWriteOnce explanation was too absolute. Reworded it because RWO is node-scoped, so rolling updates can fail with multi-attach errors or risk two pods accessing the same database volume rather than always failing purely because of RWO.
- The Bitnami Helm values used unsupported camelCase keys under a top-level `postgresql:` section. Replaced them with `primary.extendedConfiguration` using PostgreSQL parameter names as documented by the Bitnami chart.
- The CloudNativePG example placed `scheduledBackups` under `Cluster.spec`, which is not part of the Cluster API. Replaced it with a separate `postgresql.cnpg.io/v1` `ScheduledBackup` resource that references the cluster.
- The backup CronJob used the official `postgres:16` image while running `aws s3 cp`; that image does not include the AWS CLI. Changed the example to use a custom image that must include both `pg_dump` and the AWS CLI.
- The custom PostgreSQL configuration section said to mount a ConfigMap but only defined one. Changed the wording to say it defines the configuration file.

## Review Notes
The remaining examples are valid as illustrative manifests, but production deployments should pin container images by immutable tags or digests, store credentials outside plain Git, and verify that optional CRDs such as ServiceMonitor or PodMonitor are installed before enabling them.
