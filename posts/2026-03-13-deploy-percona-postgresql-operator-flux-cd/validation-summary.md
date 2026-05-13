# Validation Summary: How to Deploy Percona PostgreSQL Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Percona Operator for PostgreSQL
- PerconaPGCluster custom resource
- PostgreSQL
- PgBouncer
- pgBackRest
- S3-compatible backup storage

## Sources Consulted
- Percona Operator for PostgreSQL documentation: https://docs.percona.com/percona-operator-for-postgresql/latest/
- Percona Operator for PostgreSQL v2.4.1 example custom resource: https://github.com/percona/percona-postgresql-operator/blob/v2.4.1/deploy/cr.yaml
- Percona Operator for PostgreSQL v2.4.1 CRD definitions: https://github.com/percona/percona-postgresql-operator/blob/v2.4.1/deploy/crd.yaml
- Percona Helm charts repository index: https://percona.github.io/percona-helm-charts/index.yaml
- Percona pg-operator Helm chart values: https://github.com/percona/percona-helm-charts/tree/main/charts/pg-operator
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The `PerconaPGCluster` manifest omitted the required `spec.postgresVersion` field for the v2 API. Added `postgresVersion: 16`.
- The PostgreSQL, PgBouncer, and pgBackRest image tags did not match the published Percona v2.4.1 example image tags. Updated them to the v2.4.1 `ppg16.3` image tags from the official example manifest.
- The tutorial connected as an `app` user but did not define that user in `spec.users`. Added an `app` user with an `app` database and `cluster1-pguser-app` generated secret name.
- The S3 pgBackRest secret was created but not referenced by the cluster. Added `backups.pgbackrest.configuration` with the secret reference and aligned the secret name with the reference.
- The Flux Kustomization applied the operator HelmRelease and `PerconaPGCluster` in the same path, which can fail because the CRD is installed by the HelmRelease. Split the example into operator and cluster Kustomizations and added `dependsOn` so the cluster is applied after the operator.
- The Helm chart's default fullname would not match the health check Deployment name. Added `fullnameOverride: percona-postgresql-operator`.
- Verification commands used a fixed pod name that is not reliable for this operator. Replaced it with a label-based primary pod lookup and explicit container names.
- The connection command did not provide the generated application user password. Added a `PGPASSWORD` lookup from the generated user secret.
- The service-name note was too narrow. Updated it to mention both `cluster1-ha` and `cluster1-pgbouncer`.

## Review Notes
- The tutorial remains pinned to Percona Operator for PostgreSQL 2.4.1, which is not the latest release as of the validation date. This is technically valid because the chart and images are version-pinned, but future readers may prefer a newer supported operator version.
- The S3 credentials shown are placeholders and should be replaced with real credentials stored through a secret-management workflow such as SealedSecrets.
