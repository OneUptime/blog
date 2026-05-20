# Validation Summary: How to Deploy the Zalando Postgres Operator with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes
- Zalando Postgres Operator
- PostgreSQL
- PgBouncer
- Prometheus Operator
- Prometheus postgres_exporter
- AWS S3 backups

## Sources Consulted
- Zalando Postgres Operator cluster manifest reference: https://opensource.zalando.com/postgres-operator/docs/reference/cluster_manifest.html
- Zalando Postgres Operator operator parameters reference: https://opensource.zalando.com/postgres-operator/docs/reference/operator_parameters.html
- Zalando Postgres Operator user guide: https://opensource.zalando.com/postgres-operator/docs/user.html
- Zalando Postgres Operator administrator guide: https://opensource.zalando.com/postgres-operator/docs/administrator.html
- Zalando Postgres Operator v1.12.2 Helm chart values: https://github.com/zalando/postgres-operator/blob/v1.12.2/charts/postgres-operator/values.yaml
- Zalando Postgres Operator v1.12.2 CRD schema: https://github.com/zalando/postgres-operator/blob/v1.12.2/manifests/postgresql.crd.yaml
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/helm/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Prometheus postgres_exporter README and collector source: https://github.com/prometheus-community/postgres_exporter

## Issues Found
- The Helm values used `configPostgresPod`, which is not a valid Zalando chart values key in v1.12.2. Changed it to `configPostgresPodResources`.
- The Helm values placed `enable_teams_api` under `configGeneral`, but the chart expects this under `configTeamsApi`. Moved the setting to the correct group.
- The Helm values included storage-class settings under `configKubernetes` that are not valid v1.12.2 operator configuration keys. Removed those global settings because the storage class is already set correctly on the cluster `spec.volume`.
- Logical backups were enabled on the cluster without configuring the logical backup S3 bucket. Added `configLogicalBackup` values for the S3 provider, bucket, and region.
- The RBAC snippet used `list` with `resourceNames` and had no RoleBinding. Changed the Role to `get`, added a ServiceAccount, and added a RoleBinding.
- The application Deployment referenced database Secrets from the `default` namespace even though the operator creates them in the database cluster namespace. Changed the Deployment namespace to `databases` and set the matching ServiceAccount.
- The monitoring section implied the operator exposes a PostgreSQL exporter by default. Added a prerequisite note that a PostgreSQL exporter sidecar or custom Spilo image must expose the named `exporter` port before the PodMonitor works.
- The replication lag alert used a non-standard metric name. Updated it to the postgres_exporter `pg_stat_replication_pg_wal_lsn_diff` metric and changed the alert description from seconds to bytes.
- The connection usage alert expression did not aggregate labels safely. Updated it to aggregate activity and max connection metrics by server.
- The upgrade section stated that all PostgreSQL major version upgrades require a new cluster and migration. Updated it to reflect the operator's in-place major upgrade workflow and clone-based alternative.
- The operator upgrade section overstated zero-downtime behavior and omitted the Helm CRD caveat. Reworded it to say controller upgrades should not restart clusters by themselves and noted that Helm chart upgrades do not automatically update the `Postgresql` and `OperatorConfiguration` CRDs.

## Review Notes
The post is now technically valid for the pinned Zalando Postgres Operator chart version 1.12.2. The monitoring examples still depend on the reader installing or baking in a PostgreSQL exporter, because the Zalando operator does not add that exporter port by default.
