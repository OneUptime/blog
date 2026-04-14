# Validation Summary: How to Use Dapr with Kratix Promise-Based Platform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Kratix (platform-as-a-product framework)
- Kubernetes (CRDs, Namespaces, Components)
- Crossplane Helm Provider (for Helm chart installation)
- yq (YAML processing CLI)
- Flux / ArgoCD (GitOps agents)

## Sources Consulted
- Kratix source code and API types at github.com/syntasso/kratix (api/v1alpha1 types, pipeline_factory.go)
- Kratix API migration history (commit 3fd01915, July 2023: workerClusterResources -> dependencies)
- Dapr official documentation at docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Helm chart index at https://dapr.github.io/helm-charts/
- Dapr components-contrib source code (metadata.yaml for Redis state store)
- Crossplane Helm Provider source at github.com/crossplane-contrib/provider-helm (apis/cluster/release/v1beta1/types.go)
- Crossplane Helm Provider CRD definition (helm.crossplane.io_releases.yaml)

## Issues Found

1. **`workerClusterResources` field renamed to `dependencies`**: The Kratix API renamed the `workerClusterResources` field to `dependencies` in a July 2023 migration. The blog post used the obsolete field name. Changed `workerClusterResources` to `dependencies` and updated the accompanying prose.

2. **`createNamespace: true` is not a valid Crossplane Helm provider field**: The Crossplane Helm provider Release API does not have a `createNamespace` field. The correct field is `skipCreateNamespace` with an inverted boolean. Changed `createNamespace: true` to `skipCreateNamespace: false`.

3. **Dapr Helm chart version `1.13.0` is outdated**: Version 1.13.0 was released in March 2024 and is approximately two years old. The latest stable version is 1.17.4 (released April 2026). Updated the version reference from `1.13.0` to `1.17.4`.

## Review Notes
- Kratix now uses the term "Destination" rather than "worker cluster" for target environments. The blog's use of "worker cluster" is not incorrect but is older terminology. Not changed to preserve readability.
- The blog says Kratix writes output to "a GitOps repository." Kratix actually supports both GitStateStore and BucketStateStore. This is a simplification but not technically wrong for the common case. Not changed.
- The Dapr Component API version `dapr.io/v1alpha1` and all component metadata fields (redisHost, actorStateStore, type: state.redis, version: v1) are correct and current.
- The Kratix Promise API version `platform.kratix.io/v1alpha1` is correct and remains the only available version as of Kratix v0.125.0.
- The pipeline paths `/kratix/input/object.yaml` and `/kratix/output/` are correct per Kratix source code.
