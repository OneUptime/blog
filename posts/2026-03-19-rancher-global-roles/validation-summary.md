# Validation Summary: How to Create Global Roles in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher RBAC (`GlobalRole`, `GlobalRoleBinding`)
- `kubectl`
- Rancher v3 API

## Sources Consulted
- Rancher Global Permissions documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher Global Permissions documentation, v2.10: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher Global Resources documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-resources
- Rancher Custom Roles documentation: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/custom-roles
- Rancher Previous v3 API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher Kubernetes API reference for `GlobalRole` and `GlobalRoleBinding`: https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Rancher source for `GlobalRole` and `GlobalRoleBinding` types: https://github.com/rancher/rancher/blob/release/v2.12/pkg/apis/management.cattle.io/v3/authz_types.go
- Rancher source for built-in global role definitions: https://github.com/rancher/rancher/blob/release/v2.12/pkg/data/management/role_data.go
- Rancher integration tests covering v3 `globalrolebindings` fields: https://github.com/rancher/rancher/blob/release/v2.12/tests/integration/suite/test_global_role_bindings.py

## Issues Found
- The UI navigation was outdated. The post used `Users & Authentication > Roles > Global`, but current Rancher documentation uses `Users & Authentication > Role Templates` with the `Global` tab selected. I updated those steps and the related `Edit Config` wording.
- Every `kubectl` `GlobalRole` example used an invalid `spec:` wrapper. Rancher `management.cattle.io/v3` `GlobalRole` objects expose fields such as `displayName`, `description`, `rules`, `newUserDefault`, and `namespacedRules` at the top level. I removed the `spec:` wrapper from all affected YAML examples.
- The `auth-manager` UI example granted `users` read access even though Rancher’s built-in `Manage Authentication` permission is based on `authconfigs` with `get`, `list`, `watch`, and `update`. I removed the extra `users` rule and corrected the description.
- The `catalog-viewer` YAML example omitted `releases` and used the wrong CRD structure. I corrected the schema and aligned the resource list with Rancher’s catalog-related read rules.
- The `cluster-provisioner` YAML example did not reflect the resources Rancher actually needs for cluster creation and omitted supporting permissions used by Rancher’s built-in cluster-creation role. I replaced it with a top-level `GlobalRole` example aligned to Rancher’s shipped rules, including cluster creation, driver/template reads, machine-config creation, catalog repo reads, and required `namespacedRules`.
- The default-role section implied that default global roles apply to all new users. Rancher documentation distinguishes external-auth users from local users. I clarified that `newUserDefault` applies to first-time users from external authentication providers, while local users receive permissions explicitly when created or edited.
- The `Settings Viewer` and `User Manager` examples also used the invalid `spec:` wrapper. I corrected both, and I added `globalroles` read access to the `User Manager` example so it can inspect available roles while managing bindings.

## Review Notes
- The post keeps the `/v3/globalrolebindings` examples intentionally. Rancher documents the previous v3 API as still available, which preserves the article’s stated `v2.7+` compatibility even though newer Rancher releases also provide the Rancher Kubernetes API.
- Some Rancher UI labels vary slightly by version, especially around built-in permission names such as `User Base` versus `User-base`, but the corrected instructions and manifests are consistent with current Rancher documentation and the official source definitions.
