# Validation Summary: How to Configure Tenant Onboarding in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Kubernetes RBAC
- Kubernetes ResourceQuota
- Kustomize
- GitOps

## Sources Consulted
- Flux `flux create tenant` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_tenant/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `flux reconcile kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux source API reference for `GitRepository`: https://fluxcd.io/flux/components/source/api/v1/
- Flux multi-tenancy example repository: https://github.com/fluxcd/flux2-multi-tenancy
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The tenant overlay only patched the namespace, service account, and Git repository. The generated RoleBinding, Flux Kustomization, `sourceRef.name`, `serviceAccountName`, `targetNamespace`, and ResourceQuota name still referenced placeholder values, so the tenant sync would not reconcile under the intended service account or source. I added the missing patches to both the manual overlay and onboarding script.
- The platform `tenants` Flux Kustomization did not specify `serviceAccountName`. In a Flux multi-tenancy lockdown setup, the platform Kustomization that provisions namespaces, service accounts, and RBAC should reconcile with the privileged platform service account. I added `serviceAccountName: kustomize-controller`.
- The RBAC verification section only checked access inside the tenant namespace while calling it an isolation check. I split the comments and added a second `kubectl auth can-i` command against the `default` namespace so the example validates both allowed and denied scopes.

## Review Notes
- The `flux create tenant` command is documented by Flux as preview and under development, so future Flux releases may change its behavior or generated output.
- The examples assume a Flux deployment configured for multi-tenancy lockdown, where tenant Kustomizations reconcile with explicit service accounts and platform Kustomizations use a privileged service account.
