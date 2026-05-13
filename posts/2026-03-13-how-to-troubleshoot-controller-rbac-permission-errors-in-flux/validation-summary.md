# Validation Summary: How to Troubleshoot Controller RBAC Permission Errors in Flux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux
- Kubernetes
- Kubernetes RBAC
- ServiceAccounts
- kubectl
- Flux CLI
- Helm Controller
- Kustomize Controller
- Source Controller

## Sources Consulted
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux multi-tenancy and authorization model documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux GitRepository source authentication documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes `kubectl auth can-i` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The commands for finding ClusterRoleBindings and RoleBindings only checked `subjects[0]`, which could miss bindings where the Flux service account is not the first subject. Updated both commands to use `go-template` and iterate over all subjects while matching kind, name, and namespace.
- The example Flux `Kustomization` with `serviceAccountName` omitted the required `.spec.interval` field. Added `interval: 5m` so the manifest is valid for the current Flux Kustomization API.

## Review Notes
- The post's broader explanation of Flux controller RBAC, `kubectl auth can-i`, Flux CLI status and reconcile commands, default controller privileges, and Kustomization service account impersonation is consistent with current official documentation.
- Cross-namespace references may be restricted in multi-tenant Flux installations when cross-namespace references are disabled, but the post's RBAC troubleshooting guidance remains valid for clusters where such references are allowed.
