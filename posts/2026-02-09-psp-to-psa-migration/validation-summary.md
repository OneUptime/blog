# Validation Summary: How to Migrate from Pod Security Policies to Pod Security Admission Standards

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- Pod Security Policies
- Pod Security Admission
- Pod Security Standards
- kubectl
- Prometheus / PrometheusRule

## Sources Consulted
- Kubernetes Pod Security Policies: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement guide: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes built-in admission controller configuration guide: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes PSP to PSA migration guide: https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The Baseline standard was described as allowing hostNetwork. Kubernetes Pod Security Standards disallow host namespaces, including hostNetwork, in Baseline. Updated the PSA standards summary to say host namespaces are blocked and hostPorts are only allowed when unset or 0 by the built-in Pod Security Admission controller.
- The API server audit log command used `kube-apiserver-*` as a resource wildcard. `kubectl logs` does not expand Kubernetes resource name globs. Replaced it with a label-selector based command for self-hosted or static-pod control planes.
- The deployment patch script used a strategic merge patch with a container named `"*"`. Kubernetes strategic merge patches match containers by actual container name and do not support `"*"` as a wildcard, so this would not update all containers. Replaced it with a JSON Patch loop that updates each container index.
- The enforcement script read a PSA label with a fragile JSONPath expression and did not dry-run the enforcement change first. Replaced label lookup with `jq`, skipped namespaces without an audit level, and added a server-side dry-run to surface existing pod violations before applying enforcement.
- The PSP cleanup script implied that PSP-related RoleBindings can be reliably deleted with `-l psp=true`. PSP RBAC is commonly represented through Roles and ClusterRoles granting `use` on `podsecuritypolicies`, and bindings are not automatically labeled that way. Replaced the deletion command with a review command that lists PSP-related Roles and ClusterRoles before manual cleanup.
- The Prometheus alert used `apiserver_admission_webhook_rejection_count`, which is for admission webhooks, not the built-in Pod Security Admission controller. Replaced it with `pod_security_evaluations_total{decision="deny", mode="enforce"}`.
- The missing namespace PSA label alert checked for an empty transformed label on `kube_namespace_labels`. kube-state-metrics only exposes present labels. Replaced it with an `unless` expression that detects active namespaces without an enforce label.

## Review Notes
PSA is non-mutating, so workloads that relied on PSP mutation still need explicit workload manifest updates or a separate mutating admission mechanism. The post now remains technically accurate as a migration guide, but future improvements could mention pinning policy versions such as `v1.36` instead of using `latest` when strict upgrade repeatability is required.
