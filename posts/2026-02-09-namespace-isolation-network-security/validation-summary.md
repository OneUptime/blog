# Validation Summary: How to Configure Namespace Isolation with Network Policies and Pod Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Admission and Pod Security Standards
- Legacy Kubernetes PodSecurityPolicy
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Kubernetes Deployments and securityContext
- PrometheusRule / PromQL for Kubernetes monitoring
- kubectl

## Sources Consulted
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- NetworkPolicy enforcement depends on the cluster CNI plugin. Added a short caveat before the policy examples so readers know the manifests require a NetworkPolicy-capable CNI.
- The PodSecurityPolicy example did not clearly identify PSP as legacy-only. Updated the wording to specify Kubernetes v1.24 and earlier because PSP was deprecated in v1.21 and removed in v1.25.
- The PodSecurityPolicy example used `spec.seccompProfile`, which is not a valid PSP field, and placed seccomp/AppArmor annotations under `spec`. Moved seccomp and AppArmor settings to `metadata.annotations` using the legacy PSP annotation keys.
- RBAC examples included the obsolete `extensions` API group for workload resources. Removed it from the namespace admin and viewer roles because current workloads such as Deployments use `apps/v1`.
- The Pod Security alert used a non-standard `pod_security_policy_error` metric. Replaced it with the documented Pod Security Admission metric `pod_security_evaluations_total`.
- The NetworkPolicy drop alert used a generic `network_policy_drop_count` metric that Kubernetes does not define. Marked the query as CNI-specific and changed the placeholder metric name to make that dependency explicit.
- The unauthorized API access alert filtered `apiserver_audit_event_total` with labels that the Kubernetes metric does not expose. Replaced it with `apiserver_request_total`, which documents `verb` and `code` labels.

## Review Notes
The remaining examples are technically valid patterns, but production clusters may need provider-specific DNS allow rules, CNI-specific network policy observability metrics, and pinned Pod Security Standard versions instead of `latest` for predictable behavior across Kubernetes upgrades.
