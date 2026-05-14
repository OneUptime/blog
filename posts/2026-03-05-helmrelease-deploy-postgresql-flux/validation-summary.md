# Validation Summary: How to Use HelmRelease for Deploying PostgreSQL with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux HelmRepository
- Kubernetes
- Helm
- Bitnami PostgreSQL Helm chart
- PostgreSQL
- Kubernetes Secrets

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Bitnami PostgreSQL Helm chart page: https://bitnami.com/stack/postgresql/helm
- Bitnami PostgreSQL chart README: https://github.com/bitnami/charts/tree/main/bitnami/postgresql/
- Bitnami PostgreSQL chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/postgresql/values.yaml
- Artifact Hub Bitnami PostgreSQL chart listing: https://artifacthub.io/packages/helm/bitnami/postgresql

## Issues Found
- Added a `postgresql-namespace.yaml` manifest. The original article relied on `install.createNamespace`, but the `database` namespace must exist before Flux can apply namespaced resources such as the `HelmRelease` and Secret there.
- Updated the `HelmRelease` namespace comment to avoid implying that `metadata.namespace` is only a Helm target namespace. Flux uses `spec.targetNamespace` for an explicit Helm target namespace, and otherwise defaults it to the HelmRelease namespace.
- Updated the Bitnami PostgreSQL chart version examples from `16.x` / `16.4.2` to the current `18.x` / `18.6.3` line.
- Updated the `git add` command to include `postgresql-namespace.yaml` and `postgresql-secret.yaml`, so it matches the manifests introduced by the tutorial.
- Updated the `kubectl run` PostgreSQL connectivity test to set `PGPASSWORD` from the Kubernetes Secret. Without a password, `psql` may prompt or fail in non-interactive usage.

## Review Notes
- The HelmRepository OCI configuration, Flux `HelmRelease` API version, `valuesFrom` usage, and Bitnami PostgreSQL chart value keys were verified against current documentation.
- The example still uses a basic single-instance PostgreSQL deployment. Production deployments may also need backups, restore procedures, network policies, storage class selection, and operational runbooks.
