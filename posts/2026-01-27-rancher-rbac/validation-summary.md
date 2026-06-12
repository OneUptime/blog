# Validation Summary: How to Configure Rancher RBAC

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Rancher Manager RBAC
- Kubernetes RBAC
- Rancher GlobalRole, RoleTemplate, ClusterRoleTemplateBinding, and ProjectRoleTemplateBinding resources
- Rancher authentication providers
- Rancher project resource quotas
- Rancher API audit logging
- kubectl

## Sources Consulted
- Rancher Manager documentation: Global Permissions - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher Manager documentation: Cluster and Project Roles - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher Manager documentation: Custom Roles - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/custom-roles
- Rancher Manager documentation: Configure Active Directory - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-active-directory
- Rancher Manager documentation: Configure Generic OIDC - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-generic-oidc
- Rancher Manager documentation: Configure GitHub - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-github
- Rancher Manager documentation: API Audit Log - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-api-audit-log
- Rancher Manager documentation: Project Resource Quotas - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher v2.12 API type definitions - https://github.com/rancher/rancher/tree/release/v2.12/pkg/apis/management.cattle.io/v3
- Rancher v2.12 Helm chart values - https://github.com/rancher/rancher/blob/release/v2.12/chart/values.yaml
- Kubernetes RBAC documentation - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes PodSecurityPolicy documentation - https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes kubectl documentation - https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- ClusterRoleTemplateBinding examples were missing the required `clusterName` field. Added `clusterName: c-xxxxx` to the cluster owner, cluster member, and emergency access binding examples.
- The security auditor role claimed that `list` on secrets exposes metadata only. Kubernetes Secret list responses include secret objects, so this is not metadata-only access. Removed the secrets rule and replaced it with a caution.
- The Active Directory AuthConfig example used an LDAPS URL in `servers` and LDAP filters where Rancher expects separate API fields. Updated the example to use `servers`, `port`, `tls`, object-class fields, search-attribute fields, and a NetBIOS-style service account username.
- The GitHub AuthConfig example used unsupported `allowedOrganizations` and `allowedTeams` fields. Replaced them with Rancher's `accessMode` and `allowedPrincipalIds` fields.
- The project role binding audit script assumed the project name is always the binding namespace. Updated it to use `status.backingNamespace` when available and fall back to the project ID.
- The audit logging Helm values omitted `auditLog.enabled`, described level `0` as off, used `hostPath` as a destination value, and included unsupported `format` and `path` keys. Updated the values to match Rancher's Helm chart options.

## Review Notes
- PodSecurityPolicy is deprecated and removed from Kubernetes v1.25. The post already qualifies the PSP rule with "if enabled", but future revisions should prefer Pod Security Admission examples for current Kubernetes clusters.
- The auth provider snippets are representative API-shaped examples. Rancher commonly recommends configuring and testing auth providers through the UI or API apply/test actions so external identity data and secrets are validated correctly.
