# Validation Summary: How to Deploy CockroachDB Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and HelmRelease
- CockroachDB
- CockroachDB Operator
- CockroachDB Helm charts
- Kubernetes Jobs, Services, Ingress, PVCs, and TLS secrets

## Sources Consulted
- CockroachDB docs: Deploy CockroachDB with the CockroachDB Operator - https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-with-cockroachdb-operator
- CockroachDB docs: Resource Management with the CockroachDB Operator - https://www.cockroachlabs.com/docs/stable/configure-cockroachdb-operator
- CockroachDB docs: Vectorized Query Execution - https://www.cockroachlabs.com/docs/stable/vectorized-execution
- CockroachDB Helm charts repository and chart values - https://github.com/cockroachdb/helm-charts
- CockroachDB v2 Helm repository index - https://charts.cockroachdb.com/v2/index.yaml
- CockroachDB public operator repository examples and CRD schema - https://github.com/cockroachdb/cockroach-operator
- Flux HelmRelease documentation - https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post used `https://charts.cockroachdb.com` with chart name `cockroach-operator` and version `6.0.13`, but the current CockroachDB operator Helm chart is published in the v2 repository as `cockroachdb-operator-chart` version `1.0.0-rc.1`. Updated the HelmRepository URL and HelmRelease chart metadata.
- The original cluster manifest mixed the older public operator `CrdbCluster` API shape with current operator Helm chart usage. Replaced the direct `v1alpha1` custom resource with a `cockroachdb-chart` HelmRelease using the current chart values structure.
- The original Kubernetes version prerequisite was too low for the current CockroachDB operator chart documentation. Updated it to Kubernetes v1.30+.
- The original cluster configuration used `additionalArgs` and `--vectorize=on`. The current chart uses `startFlags`, and CockroachDB vectorized execution is configured as a SQL session variable and is enabled by default. Updated cache and SQL memory settings to `startFlags` and removed the vectorize startup flag.
- The original TLS job mounted a single secret directly, which would not provide the filenames expected by `cockroach sql --certs-dir`. Updated the volume to project the CA config map and client secret keys as `ca.crt`, `client.root.crt`, and `client.root.key`.
- The original job used the operator service account. Updated it to use the CockroachDB release service account.
- The original verification commands used insecure SQL against a TLS-enabled cluster and assumed StatefulSet-style pod names. Updated the commands to select a pod by label and use `--certs-dir`.
- The original Flux health check referenced `cockroach-operator-manager`, but the current operator chart deploys `cockroach-operator`. Updated health checks to validate the HelmRelease resources.
- The original HelmRepository file lived outside the Kustomization path shown later in the post. Moved the example file path under `infrastructure/databases/cockroachdb` so the Kustomization applies it.

## Review Notes
The current CockroachDB operator documentation marks the operator as Preview. The v2 chart versions and Kubernetes prerequisites should be rechecked before publication because CockroachDB chart versions are moving quickly.
