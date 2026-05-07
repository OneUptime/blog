# Validation Summary: How to Use the Rancher API for User Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher legacy `/v3` API
- Kubernetes RBAC concepts
- Bash
- `curl`
- `jq`

## Sources Consulted
- Rancher Previous v3 API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher API Keys reference: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher Global Permissions guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher API Reference: https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher source for legacy user actions: https://github.com/rancher/rancher/blob/main/pkg/auth/api/user/user_actions.go
- Rancher source for legacy user schema: https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_user.go
- Rancher source for legacy global and role-template bindings: https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_global_role_binding.go
- Rancher source for legacy cluster role template bindings: https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_cluster_role_template_binding.go
- Rancher source for legacy project role template bindings: https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_project_role_template_binding.go
- Rancher source for built-in global roles and role templates: https://github.com/rancher/rancher/blob/main/pkg/data/management/role_data.go

## Issues Found
- The post described the examples as generic/current Rancher API usage, but the commands all target the legacy `/v3` API. Updated the description, introduction, prerequisites, and summary to identify `/v3` as legacy and avoid implying RK-API coverage.
- The prerequisite text referred to "user-manager privileges," which is not an official built-in Rancher permission name. Reworded it to require an account that can manage users and role bindings, typically an Administrator.
- The introduction claimed the guide covered authentication-provider management, but no such section exists. Removed that claim.
- The cluster role examples listed `read-only` as a cluster role, but Rancher defines `read-only` as a project-scoped role template. Replaced it with a valid cluster-scoped example.
- The cluster and project binding `jq` examples mislabeled `.userPrincipalId` as `userId`. Corrected the output to show `userId` and `userPrincipalId` separately.
- The built-in `restricted-admin` role is deprecated in Rancher documentation. Added a deprecation note in the global roles list.

## Review Notes
- The examples remain valid for Rancher's legacy `/v3` API surface, which Rancher documents as the previous v3 API.
- Rancher documents RK-API as the current API surface, so a future refresh could add RK-API equivalents for the user-management flows in this post.
