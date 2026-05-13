# Validation Summary: How to Deploy ClickHouse Operator with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and Flux HelmRelease
- Altinity Kubernetes Operator for ClickHouse
- ClickHouseInstallation custom resources
- ClickHouse SQL
- ZooKeeper
- Bitnami Helm charts

## Sources Consulted
- Altinity operator installation documentation: https://docs.altinity.com/altinitykubernetesoperator/quickstartinstallation/
- Altinity Helm chart repository index: https://helm.altinity.com/index.yaml
- Altinity clickhouse-operator repository and replication examples: https://github.com/Altinity/clickhouse-operator
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://v2-0.docs.fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Bitnami charts repository documentation: https://github.com/bitnami/charts
- Docker Hub Bitnami ZooKeeper chart metadata: https://registry.hub.docker.com/v2/repositories/bitnamicharts/zookeeper/tags
- ClickHouse clickhouse-client documentation: https://docs-content.clickhouse.tech/docs/en/integrations/sql-clients/cli
- ClickHouse CREATE DATABASE documentation: https://docs-content.clickhouse.tech/docs/en/sql-reference/statements/create/database

## Issues Found
- The Altinity HelmRepository used the deprecated `https://docs.altinity.com/clickhouse-operator` URL. Changed it to the current official `https://helm.altinity.com` repository.
- The Altinity operator chart version was outdated. Updated it from `0.23.5` to `0.27.0`, which is the latest version listed in the official Altinity Helm repository on 2026-05-13.
- The operator Helm values placed resource requests under a top-level `resources` key that is not used by the current chart. Moved the resources under `operator.resources`.
- The ZooKeeper HelmRelease referenced a Bitnami source and namespace that were not defined. Added the Bitnami OCI HelmRepository and a `zookeeper` Namespace manifest.
- The Bitnami ZooKeeper chart version was outdated. Updated it from `12.4.0` to `13.8.7`, the newest ZooKeeper chart tag found in Bitnami's OCI registry metadata.
- The Flux Kustomization health check targeted a Deployment name that does not match the Helm-rendered Altinity operator deployment name. Changed the health checks to wait on the `HelmRelease` resources instead, which Flux documents as the appropriate pattern for Kustomizations containing HelmReleases.
- The example `kubectl exec` pod name omitted the operator's `chi-` prefix. Updated it to `chi-chi-demo-cluster1-0-0-0`, matching the Altinity operator pod naming pattern.
- The ClickHouse command submitted multiple SQL statements without `--multiquery`. Added `--multiquery` per ClickHouse client documentation.
- The SQL created tables in the `myapp` database without first creating that database. Added `CREATE DATABASE IF NOT EXISTS myapp ON CLUSTER cluster1`.
- The `ReplicatedMergeTree` path was simplified and could collide across installations or databases. Updated it to the documented operator macro pattern using `{installation}`, `{cluster}`, `{shard}`, `{database}`, and `{table}`.

## Review Notes
- The guide still assumes the HelmRepository manifests under `infrastructure/sources` are reconciled by the reader's Flux repository structure before the HelmRelease manifests that reference them.
- Local `helm` and `kubectl` binaries were not available in the review environment, so validation used official documentation, upstream chart metadata, and registry metadata rather than local CLI rendering.
