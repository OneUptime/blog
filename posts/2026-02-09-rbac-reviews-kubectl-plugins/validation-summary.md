# Validation Summary: How to Implement RBAC Reviews and Permission Audits Using Kubectl RBAC Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- kubectl plugins
- Krew
- rbac-lookup
- kubectl-who-can
- rbac-tool
- access-matrix / rakkess
- jq
- Kubernetes CronJob
- kube-state-metrics / Prometheus

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Krew installation documentation: https://krew.sigs.k8s.io/docs/user-guide/setup/install/
- rbac-lookup usage documentation: https://rbac-lookup.docs.fairwinds.com/usage/
- kubectl-who-can README: https://github.com/aquasecurity/kubectl-who-can
- rbac-tool README: https://github.com/alcideio/rbac-tool
- access-matrix / rakkess README and usage documentation: https://github.com/corneliusweig/rakkess
- kube-state-metrics documentation: https://github.com/kubernetes/kube-state-metrics/tree/main/docs

## Issues Found
- The rbac-lookup section described resource and verb permission discovery, but rbac-lookup looks up Roles and ClusterRoles bound to matching subjects. Reworded the section and replaced unsupported examples such as `--verb`, `--namespace`, and JSON output with supported subject lookup and `wide` output examples.
- The installation verification block used `rbac-lookup --version`, which is not listed in rbac-lookup's supported flags. Replaced it with `rbac-lookup --help` and added `access-matrix help`.
- The who-can named Secret example used a separate resource name argument. Changed it to the supported `secret/database-password` form.
- The compliance script described cluster-admin checks while querying wildcard permissions. Updated variable names and output text to match what the command checks.
- The rbac-tool section used `lookup -e` as if it selected Kubernetes resources. Corrected it to use regex subject lookup, and used `who-can` for named resource access checks.
- The rbac-tool JSON visualization example used an unsupported JSON output mode for `viz`. Replaced it with `policy-rules -o json`, which is documented for programmatic policy analysis.
- The access-matrix section described a multi-subject permission matrix and JSON export. Corrected it to describe current or impersonated subject access, and replaced unsupported `--all-namespaces --output json` examples with supported `--as` and `--sa` examples.
- The comprehensive audit script used unsupported rbac-lookup flags for permissions. Replaced those with `who-can` and `rbac-tool who-can` commands.
- The jq wildcard-role checks could match wildcard verbs and wildcard resources from different rules in the same ClusterRole. Updated them to use `any(.rules[]?; ...)` so each match is evaluated against the same rule.
- The CronJob used a generic kubectl image while running kubectl plugins that would not be present. Updated the example to require a custom image that includes kubectl plus the required plugins.
- The ServiceAccount RBAC comment said it read users and groups through OIDC, but Kubernetes does not expose OIDC users and groups as core API resources. Changed the comment to ServiceAccounts and added namespace read access for all-namespace audit queries.
- The kube-state-metrics query counted ClusterRoleBinding names matching `admin`, which does not reliably count cluster-admin bindings. Updated it to match `roleref_name="cluster-admin"`.

## Review Notes
The corrected examples are still operational audit patterns rather than a complete production audit system. In a production CronJob, teams should build and pin a concrete image version with the required plugins and send reports to persistent storage instead of relying on the temporary `emptyDir` volume.
