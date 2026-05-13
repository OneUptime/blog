# Validation Summary: How to Use Platform and Tenant Separation in Flux Repository

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization and GitRepository APIs
- Flux post-build substitution and service account impersonation
- Kubernetes Kustomize overlays
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Multi-tenant Kubernetes repository structure

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/

## Issues Found
- The original `tenants.yaml` example reconciled `./tenants` without tenant-specific Flux substitutions, even though the base manifests used `${TENANT_NAME}` and `${TENANT_GROUP}`. Changed the example to a per-tenant `tenant-alpha.yaml` Kustomization that reconciles `./tenants/team-alpha` and supplies the substitutions.
- The per-tenant baseline Kustomization used `serviceAccountName: tenant-alpha`, but the limited tenant service account would not have permission to create the tenant namespace, ResourceQuota, RoleBinding, and NetworkPolicy. Removed `serviceAccountName` from the platform-controlled baseline Kustomization so the tenant bootstrap resources can be created by the platform reconciliation path.
- The `deny-all-ingress` NetworkPolicy name was inaccurate because the policy allows ingress from namespaces matching the tenant label. Renamed it to `allow-same-tenant-ingress`.
- The tenant Flux service account was bound with a `ClusterRoleBinding`, which would grant the tenant permissions across all namespaces. Changed it to a namespaced `RoleBinding` in the tenant namespace while still referencing the shared `flux-tenant` ClusterRole.
- The tenant Flux service account RoleBinding was shown under `platform/rbac`, which could fail if the tenant namespace did not exist when the platform Kustomization reconciled. Moved the example into the platform-controlled tenant baseline so it is created with the tenant namespace.
- The external tenant repository Kustomization reused the `tenant-alpha` name, which would conflict with the baseline Kustomization in the same namespace. Renamed it to `tenant-alpha-apps` and made it depend on the `tenant-alpha` baseline.
- The `targetNamespace` explanation said all resources are forced into the tenant namespace. Clarified that this applies to namespaced resources.
- The LimitRange example was shown as a platform policy without a namespace, which would not enforce limits across tenant namespaces. Moved it into the tenant baseline and added `namespace: ${TENANT_NAME}`.

## Review Notes
The Flux API versions and Kubernetes resource API versions used in the corrected examples are current. The `flux-tenant` ClusterRole is intentionally minimal for example purposes; real tenant workloads may require additional namespaced permissions for resources such as ServiceAccounts, Jobs, or custom resources.
