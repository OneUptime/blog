# Validation Summary: How to Deploy Dapr with Crossplane

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane (Kubernetes infrastructure management)
- Crossplane Helm Provider (provider-helm)
- Dapr (Distributed Application Runtime)
- Kubernetes
- Helm

## Sources Consulted
- Crossplane official install docs: https://docs.crossplane.io/latest/get-started/install/
- Crossplane provider-helm GitHub: https://github.com/crossplane-contrib/provider-helm (source types, examples, releases)
- Crossplane CompositeResourceDefinition API: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane provider-helm v0.17.0 source code (apis/release/v1beta1/types.go, apis/v1beta1/types.go)
- Dapr Helm chart repository: https://dapr.github.io/helm-charts/
- Dapr Helm chart source and values.yaml: https://github.com/dapr/dapr/tree/master/charts/dapr
- Crossplane runtime annotations: https://github.com/crossplane/crossplane-runtime

## Issues Found
- **Reconciliation annotation comment was misleading**: The original post used `crossplane.io/paused=false` with the comment "Force a reconciliation." The `crossplane.io/paused` annotation is a pause/unpause mechanism — setting it to `false` simply means "not paused" (which is the default state). While the annotation change would incidentally trigger a reconcile via a metadata watch event, this framing was misleading. Changed to use a timestamp annotation (`reconcile.crossplane.io/timestamp`) which is a clearer and more conventional pattern for triggering reconciliation on demand.

## Review Notes
- **Provider-helm version is outdated**: The post uses v0.17.0 (released Feb 2024). The latest version is v1.2.0 (released Feb 2026). The APIs used (`helm.crossplane.io/v1beta1` for Release and ProviderConfig) are correct for v0.17.0 and remain valid in newer versions.
- **Dapr version is outdated**: The post uses Dapr 1.13.0. The latest stable release is 1.17.4 (April 2026). All Helm chart values referenced (global.mtls.enabled, global.logAsJson, dapr_operator.replicaCount, dapr_sentry.replicaCount) remain valid in current versions.
- **Crossplane install does not pin a version**: The `helm install crossplane` command does not specify `--version`, meaning readers will get the latest Crossplane release. Crossplane v2.x is now available and introduces `apiextensions.crossplane.io/v2` for XRDs with structural changes (claims deprecated, new `scope` field). The XRD example in this post uses `apiextensions.crossplane.io/v1` which may still be served in v2.x for backward compatibility, but readers should be aware of this version consideration.
- **All URLs verified**: The Crossplane Helm repo URL (`https://charts.crossplane.io/stable`), Dapr Helm chart repo (`https://dapr.github.io/helm-charts/`), and provider-helm package reference (`xpkg.upbound.io/crossplane-contrib/provider-helm:v0.17.0`) are all valid and accessible.
- **All YAML schemas verified**: Release, ProviderConfig, Provider, and CompositeResourceDefinition resource specs are all correct for their respective API versions.
