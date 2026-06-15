# Validation Summary: How to Configure Multi-Tenancy in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD AppProject
- Argo CD RBAC
- Argo CD sync windows
- Argo CD orphaned resources monitoring
- Argo CD Prometheus metrics
- Kubernetes namespaces
- Kubernetes RBAC
- Prometheus alert rules

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/project-specification/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Orphaned Resources Monitoring: https://argo-cd.readthedocs.io/en/latest/user-guide/orphaned-resources/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Argo CD CLI command reference for `argocd proj list`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_list/
- Argo CD CLI command reference for `argocd proj role list`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_list/
- Argo CD CLI command reference for `argocd admin settings rbac can`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/

## Issues Found
- The global RBAC example included `p, *, *, *, */*, deny`. Argo CD gives `deny` policies priority over matching `allow` policies, so this catch-all deny would block the monitoring and project role allows. Removed the catch-all deny and clarified that unmatched requests are denied by default.
- The project examples allowed unrestricted cluster-scoped `Namespace` creation. Because `Namespace` is cluster-scoped, this could let a tenant create namespaces outside its intended boundary. Added `name: 'team-a-*'` to restrict namespace resources by name.
- The cluster resource example allowed `ClusterRole` and `ClusterRoleBinding` creation for a tenant project, which undermines multi-tenant isolation by permitting cluster-wide RBAC resources. Removed those resources from the tenant example and limited it to team-owned namespaces.
- The namespace resource blacklist used `PodSecurityPolicy`, which was deprecated in Kubernetes v1.21, removed in v1.25, and was not a namespaced resource. Replaced it with `NetworkPolicy` under `networking.k8s.io`.

## Review Notes
The remaining examples align with current Argo CD documentation for AppProject fields, project roles, sync windows, orphaned resource monitoring, metrics labels, and the referenced CLI command forms. The examples are intentionally illustrative and still require environment-specific cluster URLs, SSO group names, repository URLs, and Kubernetes RBAC scoping before production use.
