# Validation Summary: How to Implement Kubernetes RBAC Best Practices for Multi-Tenant Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings
- Kubernetes ServiceAccounts and service account tokens
- kubectl authorization commands
- Kubernetes OIDC authentication flags
- Kubernetes audit logging
- jq-based audit queries

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC good practices: https://kubernetes.io/docs/concepts/security/rbac-good-practices/
- Kubernetes ServiceAccount administration and TokenRequest documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- kube-apiserver OIDC flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes ClusterRole API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/cluster-role-v1/

## Issues Found
- The `namespace-reader` ClusterRole used `resources: ["*"]` across the core API group, which unintentionally granted `get` and `watch` on Secrets before the later Secret-only `list` rule. Replaced the wildcard rule with explicit non-secret resources because Kubernetes RBAC permissions are additive and do not support deny rules.
- The `namespace-deployer` read-only fallback rule mixed resources from different API groups in a single rule. Split core, `apps`, and `batch` resources into separate rules so `services`, `replicasets`, and `jobs` are authorized under the correct API groups.
- The Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `selector.matchLabels` and `template.metadata.labels`.
- The `platform-observer` ClusterRole used wildcard read access while claiming to exclude Secrets. Replaced the wildcard with explicit common non-secret resources.
- The namespace admin explanation implied RoleBindings can freely reference existing ClusterRoles. Clarified Kubernetes' RBAC privilege-escalation guard: users can only bind permissions they already hold unless they have the special `bind` permission.
- The aggregation example labeled the aggregate ClusterRole itself, which was misleading because aggregate roles should select separately labeled ClusterRoles and their `rules` field is controller-managed. Reworked the snippet to show an aggregate `namespace-admin` role plus a separate labeled contributor ClusterRole.
- The external CI token section recommended a long-lived service account token Secret. Updated it to use `kubectl create token` for a short-lived TokenRequest-based token, which is the current recommended mechanism.
- The audit policy text claimed it directly logged authorization failures. Adjusted the wording to explain that it logs request metadata and that authorization failures should be filtered downstream using audit annotations.
- The PromQL example used labels that Kubernetes' `apiserver_audit_event_total` metric does not expose. Replaced it with an audit-log `jq` filter over official audit event fields.

## Review Notes
The post is technically relevant and current after the fixes. The examples still intentionally use representative resource lists; production clusters should adjust them for installed CRDs, admission policies, and provider-specific authentication setup.
