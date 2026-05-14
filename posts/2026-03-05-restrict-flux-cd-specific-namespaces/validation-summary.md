# Validation Summary: How to Restrict Flux CD to Specific Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Flux CD HelmRelease
- Flux CD multi-tenancy
- Kubernetes RBAC
- Kubernetes service account impersonation
- kubectl authorization checks

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes user impersonation documentation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post described `targetNamespace` as applying to every resource. Updated the text to clarify that it applies to namespaced resources, while RBAC is still required to block cluster-scoped resources.
- The Kustomization `serviceAccountName` example created the impersonated service account in `team-a`, but Flux resolves `serviceAccountName` in the same namespace as the Kustomization. Updated the service account to live in `flux-system` and changed the tenant RoleBinding subject to reference that namespace.
- The cross-namespace references section implied a Kustomization in `flux-system` could reference a service account in `team-a` via `serviceAccountName`. Updated the explanation to state that the service account must be in the Kustomization namespace.
- The impersonation example used a `ClusterRoleBinding` to `cluster-admin` as the explicit impersonation grant. Replaced it with a scoped impersonation `ClusterRole` and `ClusterRoleBinding` for the named tenant service accounts.

## Review Notes
The examples assume Flux resources are managed centrally in `flux-system`. A stricter tenant model often places tenant Flux resources in tenant namespaces and may enable Flux lockdown flags such as `--no-cross-namespace-refs=true` and `--default-service-account=default`.
