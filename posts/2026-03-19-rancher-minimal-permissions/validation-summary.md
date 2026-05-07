# Validation Summary: How to Lock Down Rancher with Minimal Permissions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes RBAC
- `kubectl`
- Helm chart configuration
- Kubernetes `NetworkPolicy`
- `jq`

## Sources Consulted
- Rancher Global Permissions: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher Cluster and Project Roles: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher Locked Roles: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/locked-roles
- Rancher Users and Groups: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/manage-users-and-groups
- Rancher Tokens workflow: https://ranchermanager.docs.rancher.com/api/workflows/tokens
- Rancher Using API Tokens: https://ranchermanager.docs.rancher.com/api/api-tokens
- Rancher API Keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher API Reference: https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Enforcing Templates (RKE1): https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/enforce-templates
- Rancher Additional Steps for Project Network Isolation: https://ranchermanager.docs.rancher.com/integrations-in-rancher/istio/configuration-options/project-network-isolation
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- Step 1 used outdated or misleading `Setting` patch commands for default cluster and project roles. I removed those commands and kept the supported UI-based settings guidance. I also limited `cluster-template-enforcement` to older RKE1-based provisioning, which is what Rancher documents it for.
- Step 2 suggested creating a custom login-only `GlobalRole` and replacing built-in defaults with it. I replaced that with the documented `User-Base` default-role workflow, because Rancher’s built-in global permissions are modular and default assignment is managed from the Role Templates UI.
- Step 3 and Step 4 used `RoleTemplate` manifests with a nested `spec:` block. I corrected the YAML to use the actual Rancher API shape, where fields such as `context`, `displayName`, and `rules` are top-level fields on the resource.
- Step 5 pointed to the wrong UI location and implied locking was generally available for all role types. I updated the instructions to the documented Role Templates flow and noted that global roles cannot be locked.
- Step 6 audited legacy `tokens.management.cattle.io` objects as if they were the current token API. I updated the commands to use `tokens.ext.cattle.io` for Rancher v2.13+ and added a note that older releases still use the legacy resource.
- Step 7 mixed `destination: sidecar` with `hostPath` rotation settings and omitted `auditLog.enabled`. I changed the example to a consistent `hostPath` configuration and enabled audit logging explicitly.
- Step 8 claimed that omitting `pods/exec` permissions completely disables the Rancher kubectl shell. I removed that unsupported claim and replaced it with the documented token-audit caveat for `kubectl-shell-*` tokens.
- Step 9 overstated project network isolation. I qualified it so it only claims cross-project pod isolation on CNIs that actually enforce Kubernetes `NetworkPolicy`.
- Step 10 used `kubectl get settings ...` in the validation script. I updated those lines to the documented `kubectl get setting ...` form.

## Review Notes
- The post still spans multiple Rancher eras: some guidance applies broadly to Rancher v2.7+, while token management and public token APIs changed in Rancher v2.13+, and RKE1 template enforcement is only relevant to older RKE1-based workflows.
- The role examples are syntactically valid after correction, but organizations should still test custom `RoleTemplate` objects in a non-production environment because effective permissions depend on how those roles are assigned and combined.
