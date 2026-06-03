# Validation Summary: Configure RBAC to Restrict Creation of ClusterRoleBindings to Platform Admins

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Kubernetes RBAC
- ClusterRole and ClusterRoleBinding resources
- kubectl
- Kubernetes audit logging
- jq
- GitLab CI

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kubectl create clusterrolebinding reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_clusterrolebinding/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes default RBAC bootstrap policy source: https://github.com/kubernetes/kubernetes/blob/v1.34.0/plugin/pkg/auth/authorizer/rbac/bootstrappolicy/policy.go
- Kubernetes controller RBAC bootstrap policy source: https://github.com/kubernetes/kubernetes/blob/v1.34.0/plugin/pkg/auth/authorizer/rbac/bootstrappolicy/controller_policy.go
- Kubernetes generated metrics documentation source: https://github.com/kubernetes/kubernetes/blob/v1.34.0/test/instrumentation/documentation/documentation.md

## Issues Found
- Clarified that creating a ClusterRoleBinding alone is not sufficient to grant `cluster-admin`; the user must also be authorized to bind the referenced ClusterRole or already hold all permissions in it. This matches Kubernetes RBAC privilege escalation prevention rules.
- Corrected the default ClusterRole audit expectation. The `system:controller:clusterrole-aggregation-controller` role has permissions for `clusterroles`, not `clusterrolebindings`, so it should not appear in the query for ClusterRoleBinding creation.
- Replaced the Prometheus alert example that used unsupported labels on `apiserver_audit_event_total`. Official Kubernetes metrics documentation does not expose `objectRef_resource`, `verb`, or response-code labels for that metric, so the post now recommends alerting from the audit log backend and shows a valid `jq` filter.

## Review Notes
The remaining Kubernetes manifests and kubectl examples use current `rbac.authorization.k8s.io/v1` APIs and valid kubectl command forms. The break-glass script assumes GNU `date -Iseconds`; teams using BSD/macOS `date` would need a portable timestamp command.
