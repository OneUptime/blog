# Validation Summary: How to Use RBAC Policies That Restrict PodSecurityPolicy Creation and Binding

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Kubernetes PodSecurityPolicy
- Kubernetes RBAC
- Kubernetes Pod Security Admission
- Kubernetes audit logging
- kubectl
- Prometheus-style alerting from audit-derived metrics

## Sources Consulted
- Kubernetes documentation: Pod Security Policies - https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes documentation: Deprecated API Migration Guide - https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes documentation: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: Enforce Pod Security Standards with Namespace Labels - https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes documentation: Migrate from PodSecurityPolicy to the Built-In PodSecurity Admission Controller - https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes documentation: Audit Annotations - https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/
- Kubernetes documentation: Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kubectl reference: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The introduction described PSP as deprecated but did not make clear that PSP was removed in Kubernetes v1.25. Updated the scope to Kubernetes v1.24 and earlier, or distributions that still provide PSP-compatible APIs.
- The PSP use-permission explanation said a RoleBinding grants the `use` verb. Updated it to include RoleBinding or ClusterRoleBinding, matching Kubernetes RBAC behavior.
- The `kubectl auth can-i` PSP checks used the unqualified resource name. Updated them to `podsecuritypolicies.policy` for clarity.
- The audit-log example claimed `authorization.k8s.io/decision` identifies which PSP was used. Replaced it with a `kubernetes.io/psp` pod annotation query and a generic audit annotation query.
- The restricted pod test used `kubectl run --image=nginx` without non-root and capability-drop settings required by the restricted PSP. Updated the command to create a BusyBox pod with `runAsNonRoot`, non-zero `runAsUser`, `allowPrivilegeEscalation: false`, and `capabilities.drop: ["ALL"]`.
- A shell command was placed in a `yaml` code fence. Changed the fence to `bash`.
- The RBAC escalation section implied Kubernetes always blocks RoleBinding escalation even when a user can bind any ClusterRole. Clarified that RBAC blocks the binding unless the user already has the referenced permissions or explicit `bind` permission.
- The Prometheus alert used `apiserver_audit_event_total` with labels that the Kubernetes metric does not expose. Updated the text and example to describe a custom audit-log-derived metric.

## Review Notes
The post is technically valid for PSP-era Kubernetes clusters only. For modern upstream Kubernetes versions, Pod Security Admission or a third-party admission controller is the supported path.
