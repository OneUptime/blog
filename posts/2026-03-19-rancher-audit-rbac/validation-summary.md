# Validation Summary: How to Audit RBAC Permissions in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes RBAC
- `kubectl`
- `jq`
- Helm
- `cron`

## Sources Consulted
- Rancher API Reference: https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher Users workflow: https://ranchermanager.docs.rancher.com/v2.14/api/workflows/users
- Rancher API audit logging guide: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/enable-api-audit-log
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Global Permissions: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The cluster and project binding examples used `roleTemplateId`, but Rancher's management API documents `roleTemplateName` for `ClusterRoleTemplateBinding` and `ProjectRoleTemplateBinding`. I updated the commands and report script to use the documented field name.
- The project audit script queried `projectroletemplatebindings` in the cluster namespace. Rancher stores project role template bindings in the project's `status.backingNamespace`, so I updated the script to read `status.backingNamespace` and audit bindings there.
- The original project loop relied on shell word splitting and `/` delimiters, which would break on common project display names. I replaced it with TSV output from `jq` and a `while read` loop.
- The audit-log section used an undocumented UI setting flow and mixed `destination: sidecar` with `hostPath` rotation settings that only apply to `hostPath`. I updated the section to use documented Helm values, including `auditLog.enabled: true`.
- The audit-log parsing example used Kubernetes audit-log fields such as `verb`, `objectRef.name`, and `requestReceivedTimestamp`, which do not match Rancher API audit-log entries. I replaced it with a Rancher-compatible query based on `method`, `requestURI`, `requestTimestamp`, and `user.extra.username`.
- The prerequisites and Kubernetes-level RBAC step did not make it clear that Step 6 requires access to and context for downstream clusters. I clarified the prerequisite and step text.
- The report script wrote output to the current directory, while the cron example tried to mail a file from `/opt/reports` using a wildcard redirection. I aligned the script with `/opt/reports`, ensured the directory exists, and updated the cron line to reference the exact dated report file.
- The orphaned-binding section description implied group detection, but the script only checked missing Rancher `User` resources. I narrowed the description to match the code.

## Review Notes
- Rancher's API audit log behavior around `auditLog.level=0` differs between older archived docs and newer/current docs. The post now uses `auditLog.enabled: true` plus `auditLog.level: 2`, which is safer guidance across the stated `v2.7+` range.
- The post continues to use Rancher's documented management-cluster RBAC resources such as `globalrolebindings`, `clusterroletemplatebindings`, `projectroletemplatebindings`, and `roletemplates`.
