# Validation Summary: How to Use flux create tenant Command in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD CLI
- Flux multi-tenancy
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Kustomize
- GitOps workflows

## Sources Consulted
- Flux CLI documentation for `flux create tenant`: https://fluxcd.io/flux/cmd/flux_create_tenant/
- Flux `create_tenant.go` source implementation: https://github.com/fluxcd/flux2/blob/main/cmd/flux/create_tenant.go
- Flux multi-tenancy configuration documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux multi-tenancy reference repository: https://github.com/fluxcd/flux2-multi-tenancy
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post described `flux create tenant` as a general built-in CLI tool without mentioning that the official Flux CLI documentation currently marks the command as preview and subject to possible breaking changes. Added that caveat to the introduction.
- The post implied the generated resources alone make Flux reconcile tenant Kustomizations under the tenant identity. Updated the explanation to clarify that Flux uses the tenant identity when the Flux Kustomization or HelmRelease is configured with the generated service account, or when multi-tenancy lockdown configures a tenant default service account.
- The post said the generated RoleBinding grants permissions to the service account, but the actual generated RoleBinding includes both the service account and the Flux reconciler user subject. Updated the resource description accordingly.
- The post said a custom ClusterRole must already exist in the cluster. Adjusted this to say it must exist by the time the generated RoleBinding is applied, which is more accurate for GitOps workflows where both may be committed and applied together.

## Review Notes
The command syntax, `--with-namespace`, `--cluster-role`, and inherited `--export` flag usage are current in the official Flux CLI documentation. The Kubernetes RBAC explanation that a namespace-scoped RoleBinding can reference a ClusterRole and grant those permissions only within the RoleBinding namespace is accurate.
