# Validation Summary: How to Set Up Admin vs Standard User Roles in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes RBAC
- Rancher global permissions, `GlobalRole`, and `GlobalRoleBinding`
- `kubectl`
- `curl`
- `jq`

## Sources Consulted
- Rancher docs: Managing Role-Based Access Control (RBAC) - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac
- Rancher docs: Global Permissions - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher docs: Global Resources - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-resources
- Rancher docs: Custom Roles - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/custom-roles
- Rancher docs: Local Authentication - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/create-local-users
- Rancher docs: API Keys - https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher docs: Previous v3 Rancher API Guide - https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher docs: API Reference - https://ranchermanager.docs.rancher.com/v2.12/api/api-reference

## Issues Found
- The UI navigation for default global permissions was outdated. The post used `Users & Authentication > Roles > Global`; it was corrected to Rancher's current `Users & Authentication > Role Templates` flow with the `Global` tab and `Edit Config`.
- The post described `User-Base` as effectively giving new users "no access by default." Rancher documents `User-Base` as basic log-in access, so the wording and follow-up guidance were corrected.
- The restricted-user section suggested creating a custom `GlobalRole` to remove cluster-creation rights. Rancher documents a simpler supported approach for this case: remove `Standard User` as the default and use `User-Base` as the default, then assign cluster/project roles separately. The section was rewritten to reflect that.
- Both `GlobalRole` YAML examples were structurally incorrect because they nested fields under `spec`. Rancher's documented `GlobalRole` schema and examples use top-level fields such as `displayName`, `description`, `newUserDefault`, `rules`, and `inheritedClusterRoles`. The invalid manifest structure was removed/corrected.
- The original "platform operator" example granted catalog-management permissions. Rancher documents that catalog configuration can enable privilege escalation for non-admin users, so that example was replaced with a safer `inheritedClusterRoles: [cluster-owner]` pattern for downstream-cluster management.
- The legacy `/v3` API example was updated to use API-key basic authentication, which is what Rancher documents for the previous v3 API.
- The audit command only reported user-bound admin entries and labeled counts as users. It was corrected to audit role bindings, include group principals when present, and clarify that group membership must be checked separately for effective admin access.
- The post used `kubectl` without listing the required access. A prerequisite for `kubectl` access to Rancher management resources was added.

## Review Notes
- The `/v3` API remains available, but Rancher documents it as the previous/legacy API. Newer Rancher automation should prefer the Rancher Kubernetes API where practical.
- The `kubectl` examples assume access to Rancher management resources, not just a downstream cluster kubeconfig.
- Current Rancher docs use the `Role Templates` UI path. Older archived versions in the `v2.7` range may use slightly different labels, but the corrected post now matches Rancher's current documentation set.
