# Validation Summary: How to Configure RBAC for Multi-Tenant K8s Clusters with Namespace-Scoped Admin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes namespaces and multi-tenancy
- Kubernetes ResourceQuota and LimitRange
- Kubernetes ServiceAccounts and TokenRequest
- Kubernetes audit policy
- kubectl
- cert-manager custom resources

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl create rolebinding reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_rolebinding/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes ServiceAccount API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-account-v1/

## Issues Found
- The post claimed the namespace-scoped approach "prevents privilege escalation" outright. Changed this to "helps reduce privilege escalation risk" because Kubernetes RBAC reduces access scope, but namespace admins can still gain powerful namespace-level access depending on Secret and ServiceAccount permissions.
- The ServiceAccount token restriction example granted read verbs on `serviceaccounts/token` and did not address legacy long-lived token Secrets. Updated the text and snippet to state that TokenRequest creation uses `create` on `serviceaccounts/token`, and that allowing tenants to create or update `kubernetes.io/service-account-token` Secrets can still let them create long-lived ServiceAccount tokens.
- The RBAC privilege escalation explanation only mentioned RoleBindings referencing Roles. Updated it to cover Role and RoleBinding creation/update, including the `escalate` and `bind` verbs documented by Kubernetes.
- The cert-manager example comment said "Read-only access to certificates" while the verbs allowed create, update, patch, and delete. Changed the comment to "Manage namespaced certificate resources."
- The audit policy used `users: ["*"]` to mean all users. Kubernetes audit policy fields use an empty list or omitted field to match every user; `users: ["*"]` is not the documented catch-all. Removed the field and changed the comment to describe logging modifications in tenant namespaces.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI commands were checked against official Kubernetes kubectl reference documentation instead of local `--help` output.
- The YAML snippets in the post were parsed successfully after the corrections.
- The tutorial intentionally uses broad wildcard verbs for namespace administration. This is technically valid, but in production the exact permission set should be adjusted to each organization's tenant model, admission policies, and ServiceAccount design.
