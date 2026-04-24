# Validation Summary: How to Automate User Management in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher previous v3 API
- Rancher Kubernetes API documentation
- Rancher RBAC
- Active Directory / LDAP integration
- Terraform Rancher2 provider
- Bash
- `curl`
- `jq`

## Sources Consulted
- Rancher, "Previous v3 Rancher API Guide": https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher, "Users" workflow: https://ranchermanager.docs.rancher.com/v2.13/api/workflows/users
- Rancher, "API Reference": https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher, "API Keys": https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher, "Tokens": https://ranchermanager.docs.rancher.com/api/workflows/tokens
- Rancher, "Configure Active Directory (AD)": https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-active-directory
- Rancher, "Configuring Authentication": https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Rancher, "Global Permissions": https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher Terraform provider, `rancher2_user` docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/user.md
- Rancher Terraform provider, `rancher2_global_role_binding` docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/global_role_binding.md
- Rancher Terraform provider, `rancher2_cluster_role_template_binding` docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/cluster_role_template_binding.md
- Rancher Terraform provider, `rancher2_project_role_template_binding` docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/project_role_template_binding.md
- Rancher source, generated v3 user client: https://raw.githubusercontent.com/rancher/rancher/main/pkg/client/generated/management/v3/zz_generated_user.go
- Rancher source, generated v3 global role binding client: https://raw.githubusercontent.com/rancher/rancher/main/pkg/client/generated/management/v3/zz_generated_global_role_binding.go
- Rancher source, generated v3 cluster role template binding client: https://raw.githubusercontent.com/rancher/rancher/main/pkg/client/generated/management/v3/zz_generated_cluster_role_template_binding.go
- Rancher source, generated v3 project role template binding client: https://raw.githubusercontent.com/rancher/rancher/main/pkg/client/generated/management/v3/zz_generated_project_role_template_binding.go
- Rancher source, generated v3 role template client: https://raw.githubusercontent.com/rancher/rancher/main/pkg/client/generated/management/v3/zz_generated_role_template.go
- Rancher validation tests, Bearer auth and user/global role binding usage: https://raw.githubusercontent.com/rancher/rancher/main/tests/validation/tests/v3_api/common.py

## Issues Found
- The post referred to the examples generically as "Rancher API" even though current Rancher docs distinguish the RK-API from the previous v3 API. I clarified that the examples use the v3 API.
- The `/v3/users` listing example was labeled as listing "local users," but Rancher documents `users` as all users known to Rancher. I corrected the comment to avoid implying the endpoint is local-user-only.
- The global-role example said it was fetching a user's "principal ID," but the code actually fetches `.id`. I corrected the comment to "user ID."
- The bulk CSV example passed the `role` column directly into `roleTemplateId`, which is an ID field. I renamed the column to `role_template_id` so the example matches Rancher's API field semantics.
- The bulk provisioning script did not handle failed user creation correctly. `jq -r '.id'` returns `null` on failure, so the original script would continue and try to create bindings for an invalid user. I added a `null`/empty check and early `continue`.
- The Terraform project binding example referenced `rancher2_project.team_project.id`, but that resource was not defined in the snippet. I replaced it with `var.project_id` so the example is self-contained and consistent with the rest of the snippet.
- The Active Directory UI navigation path was outdated. Current Rancher docs use `Users & Authentication -> Auth Provider -> Active Directory`, not `Global Settings -> Authentication -> Active Directory`.
- The AD section implied automatic group sync behavior. Rancher docs state that membership-derived permissions for existing users take effect on the next login or when an administrator refreshes group memberships. I corrected the wording and the conclusion to reflect that behavior.
- The deprovisioning script only checked for an empty string, not the `null` value emitted by `jq -r` when no user is found. I fixed the guard so the script exits cleanly for a missing user.
- The AD group binding example used `CLUSTER_ID` without defining it in that snippet. I added the variable definition so the example is runnable as shown.

## Review Notes
- The underlying v3 examples remain technically valid: Rancher's official source still exposes v3 `users`, `globalRoleBinding`, `clusterRoleTemplateBinding`, `projectRoleTemplateBinding`, and `roleTemplate` resources, and Rancher's own validation tests use `Authorization: Bearer ...` for v3 API calls.
- Rancher v2.8.0 and later also provide the RK-API, so new automation should be explicit about whether it targets RK-API or the previous v3 API.
- Rancher docs note that legacy v3 API tokens (`tokens.management.cattle.io`) are being phased out starting with Rancher v2.14.0 in favor of `tokens.ext.cattle.io`. The post's v3 token usage still works for current supported flows, but this is a version-specific caveat worth revisiting in a future refresh.
