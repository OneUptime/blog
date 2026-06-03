# Validation Summary: How to Implement Kubernetes RBAC Audit Reports for Periodic Compliance Reviews

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes audit policy
- Kubernetes CronJob
- kubectl
- Bash
- Python
- jq
- Prometheus / Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RoleBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/role-binding-v1/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver audit configuration API: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The Python code examples placed a filename comment before the shebang, so `chmod +x` execution would not use the Python interpreter. Moved `#!/usr/bin/env python3` to the first line of both Python snippets.
- The Bash script had the same shebang placement issue. Moved `#!/bin/bash` to the first line of the script snippet.
- The privilege-escalation detector did not identify wildcard RBAC permissions such as `apiGroups: ["*"]`, `resources: ["*"]`, and `verbs: ["*"]`. Updated it to account for wildcard API groups and resources.
- Sensitive-resource detection missed roles that grant wildcard resource access. Updated it to treat `resources: ["*"]` as access to sensitive resources.
- The unused RBAC section claimed to find unused roles and bindings, but the script actually checked ServiceAccounts and orphaned RoleBindings. Adjusted the heading and description to match the implementation.
- The RoleBinding orphan check assumed every subject was a ServiceAccount in the RoleBinding namespace. Updated the jq query and shell loop to only check `ServiceAccount` subjects and honor an explicit subject namespace.
- The audit policy put the broad RBAC rule before the narrower ClusterRoleBinding rule. Since Kubernetes audit policies use the first matching rule, the narrower rule would not take effect. Reordered the rules.
- The audit policy described ClusterRoleBinding changes as privilege-escalation attempts. Revised the comment to accurately describe the rule.
- The Prometheus alert examples used labels on `apiserver_audit_event_total` that Kubernetes does not expose. Replaced the expressions with `apiserver_request_total`, using documented labels such as `verb`, `group`, `resource`, and `code`.
- The compliance report only checked ClusterRoles for wildcard permissions while describing the finding as roles generally. Updated it to include namespaced Roles and to check wildcard API groups as well.

## Review Notes
- The snippets are syntactically valid after the fixes. The Python and Bash examples were syntax-checked locally, and the YAML snippets parsed successfully.
- The Prometheus alerts now detect RBAC resource changes through kube-apiserver request metrics. Detecting a specific `cluster-admin` binding by object name would require audit-log-derived metrics or another log pipeline, because Kubernetes' native request metric does not include object names.
