# Validation Summary: How to Configure HelmRelease Service Account in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Kubernetes HelmRelease custom resources
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- kubectl
- Flux CLI

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux security documentation: https://fluxcd.io/flux/security/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux CLI `get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI source for `helmrelease` alias: https://raw.githubusercontent.com/fluxcd/flux2/main/cmd/flux/get_helmrelease.go
- Kubernetes user impersonation documentation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Cluster-Scoped Resources section said charts that create cluster-scoped resources need a ClusterRole and ClusterRoleBinding "instead of" namespace-scoped RBAC. This was inaccurate for charts that also create namespaced resources, because the shown ClusterRole only grants cluster-scoped permissions. Changed the wording to state that cluster-scoped permissions are needed in addition to namespace-scoped permissions, unless the ClusterRole also grants all required namespaced permissions.

## Review Notes
- The `spec.serviceAccountName` field is valid in the current Flux HelmRelease v2 API and is documented as the Kubernetes ServiceAccount to impersonate during reconciliation.
- The HelmRelease examples use the supported chart template style under `.spec.chart.spec`. Current Flux also supports `.spec.chartRef`, especially for direct OCIRepository references, but the chart template style shown remains valid.
- The `flux get helmrelease` command is valid because the Flux CLI defines `helmrelease` as an alias for `helmreleases`.
