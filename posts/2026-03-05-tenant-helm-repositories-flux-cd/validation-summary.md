# Validation Summary: How to Configure Tenant-Specific Helm Repositories in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux helm-controller
- Kubernetes Custom Resources
- Kubernetes RBAC
- Kubernetes Secrets
- Helm repositories and Helm charts
- OCI Helm registries
- Kustomize

## Sources Consulted
- Flux HelmRepository API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux CLI `flux get sources helm` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `flux reconcile` documentation: https://fluxcd.io/flux/cmd/flux_reconcile/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes `kubectl create secret docker-registry` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Bitnami charts repository documentation: https://github.com/bitnami/charts

## Issues Found
- The shared repository section stated that tenants reference shared repositories by specifying the source namespace, but did not mention that Flux controllers can disable cross-namespace references. Updated the sentence to clarify that this works only when cross-namespace references are enabled. This aligns the post with Flux's HelmRelease API, which supports `sourceRef.namespace`, and Flux's multi-tenancy hardening guidance, which recommends `--no-cross-namespace-refs=true`.

## Review Notes
- All YAML snippets parse successfully.
- The Flux API versions used in the examples, `source.toolkit.fluxcd.io/v1` for `HelmRepository` and `helm.toolkit.fluxcd.io/v2` for `HelmRelease`, are current.
- The private HTTP/S Helm repository secret example uses the documented `username` and `password` keys.
- The OCI registry secret example uses `kubectl create secret docker-registry`, which Flux documents as a supported secret type for OCI Helm repositories.
- The Flux CLI commands and flags shown in the verification section are documented. The local environment did not have `flux` or `kubectl` installed, so command validation was performed against official documentation rather than local `--help` output.
- Bitnami's current documentation prefers OCI examples for installing charts, but `https://charts.bitnami.com/bitnami` remains a documented Helm repository URL, so the generic HTTP/S HelmRepository example was left intact.
