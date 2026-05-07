# Validation Summary: How to Configure Restricted Admin Role in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher RBAC / GlobalRoles
- Rancher Kubernetes API
- `kubectl`
- `jq`

## Sources Consulted
- Rancher latest global permissions docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher v2.10 global permissions docs: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher global resources docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-resources
- Rancher API reference: https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Rancher users workflow: https://ranchermanager.docs.rancher.com/v2.14/api/workflows/users
- Rancher Helm chart / install options docs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The original version scope said `Rancher v2.7+`. Current Rancher docs no longer list the built-in restricted admin role in newer releases, while Rancher v2.10 docs still document it as deprecated. I narrowed the post to `v2.7-v2.10` and added the version caveat.
- The original role description said restricted admins could modify most global settings and could not access Rancher's underlying Kubernetes resources. Rancher v2.10 docs say restricted admins can list settings but not manage them, and they still have management-cluster CRD/CR access. I corrected the capability summary to avoid overstating both permissions and restrictions.
- The original Step 1 said the role must be enabled through a `restricted-admin` global setting after installation. Rancher docs describe restricted admin as a built-in global role on supported versions, and the documented install-time control is the bootstrap option for the initial admin user. I replaced the incorrect enablement step with accurate version and bootstrap guidance.
- The original Step 1 `kubectl patch` command was also incorrect for a custom resource because `kubectl patch` defaults to strategic merge, which Kubernetes documents as unsupported for custom resources. That command was removed together with the invalid enablement workflow.
- The original API example used legacy `/v3` payload fields `globalRoleId` and `userId`. I replaced it with an official Rancher Kubernetes API example using `globalRoleName` and `userName` on `GlobalRoleBinding`.
- The original local-cluster access example used an invalid `ClusterRoleTemplateBinding` manifest shape (`spec`, `clusterName`, `roleTemplateId`, `userPrincipalId`) and implied the built-in role can be selectively opened up that way. I replaced that section with the documented custom-global-role approach instead.
- The original migration script created a `GlobalRoleBinding` with a `spec` block and used `kubectl apply` together with `generateName`. Rancher's API schema uses top-level fields, and `kubectl create` is the correct fit for generated names. I fixed both issues.
- The original audit example relied on a non-exported shell variable and a `grep` filter ahead of `jq`, which would not work reliably. I changed it to export the variable, filter directly with `jq`, and noted that the file path only applies when audit logs are configured to `hostPath`.
- The original custom `GlobalRole` example incorrectly nested fields under `spec`, attempted to use `rules` alone for downstream-cluster administration, and used broad wildcards that would be unsafe on role resources. I replaced it with a valid example using top-level fields and `inheritedClusterRoles`, and I added the `bind` / `escalate` caveat from Rancher's RBAC docs.
- The original best-practices and conclusion sections recommended restricted admin as a default forward-looking pattern. Rancher v2.10 docs instead recommend moving toward custom roles. I updated those recommendations accordingly.

## Review Notes
- The post is technically relevant after correction, but it is now explicitly scoped to Rancher versions that still include the built-in `restricted-admin` role.
- The replacement custom-role example is intentionally minimal. Real deployments should add only the specific global resources they need and review `bind` / `escalate` implications carefully.
- Audit log collection depends on Rancher's audit logging configuration. The example file path is only valid when `auditLog.destination=hostPath`; the default Rancher deployment writes audit logs to a sidecar container.
