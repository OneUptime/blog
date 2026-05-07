# Validation Summary: How to Set Up Local Authentication in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Rancher Kubernetes API (`management.cattle.io/v3`, `ext.cattle.io/v1`)
- Rancher authentication and RBAC
- `kubectl`
- `curl`
- `jq`

## Sources Consulted
- Rancher Local Authentication: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/create-local-users
- Rancher Users workflow: https://ranchermanager.docs.rancher.com/api/workflows/users
- Rancher API Keys reference: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher Tokens workflow: https://ranchermanager.docs.rancher.com/api/workflows/tokens
- Rancher Using API Tokens reference: https://ranchermanager.docs.rancher.com/api/api-tokens
- Rancher Users and Groups: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/manage-users-and-groups
- Rancher Global Permissions: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher RK-API Quick Start Guide: https://ranchermanager.docs.rancher.com/api/quickstart
- Rancher Technical FAQ: https://ranchermanager.docs.rancher.com/v2.9/faq/technical-items
- Rancher API Audit Log guide: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/enable-api-audit-log
- Rancher Adding Users to Clusters: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/add-users-to-clusters
- Rancher Adding Users to Projects: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/add-users-to-projects

## Issues Found
- The original programmatic local-user examples used the legacy `/v3/users` flow with the deprecated `password` field. I replaced them with the current Rancher Kubernetes API workflow: create a `User` resource, then create the password `Secret` in `cattle-local-user-passwords`.
- The password requirements section described password complexity requirements, but the cited Rancher setting only controls minimum password length. I corrected the text to match `password-min-length`.
- The API key example used legacy `/v3/tokens`, which Rancher documents as being phased out starting in v2.14. I replaced it with the current `tokens.ext.cattle.io` example and called out the Rancher v2.13+ requirement.
- The disable and delete user API examples used the old `/v3/users/<user-id>` pattern. I updated them to the current Rancher Kubernetes API commands.
- The admin reset command omitted `-c rancher`, while the official Rancher FAQ includes running `reset-password` in the Rancher container. I fixed that command.
- The “set a specific password” subsection was incorrect and did not actually set a password. I replaced it with the documented `ensure-default-admin` recovery path for the case where the last administrator was deleted or deactivated.
- The session settings section pointed at token TTL settings (`auth-token-max-ttl-minutes` and `kubeconfig-default-token-ttl-minutes`) instead of the user session setting. I corrected it to `auth-user-session-ttl-minutes`.
- The audit section relied on generic Rancher logs and legacy `/v3` listings. I updated it to use the documented `rancher-audit-log` sidecar when audit logging is enabled, plus current user and token resources for inspection.
- The post made fallback-access claims that were too absolute. I adjusted them to match Rancher’s guidance: keep local admin accounts available as fallback access rather than assuming access is always guaranteed.

## Review Notes
- The UI-driven portions of the guide are still broadly applicable across Rancher releases, but the corrected programmatic examples now call out version floors where needed: Rancher Kubernetes API examples require Rancher v2.8+, and the `tokens.ext.cattle.io` API key example requires Rancher v2.13+.
- Rancher documents minimum password length, not a full built-in password complexity policy, so future updates should avoid implying complexity controls unless Rancher adds them explicitly.
- API audit log inspection only works when Rancher API audit logging is enabled. Without it, the user and token inventory commands remain useful, but they are not a full audit trail.
