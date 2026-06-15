# Validation Summary: How to Implement Pod Security Standards

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Pod Security Standards
- Pod Security Admission
- PodSecurityPolicy migration
- kubectl
- Kubernetes audit logging
- kube-apiserver admission configuration

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace labels for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes built-in admission controller configuration for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes PodSecurityPolicy migration guide: https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/
- Kubernetes audit annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/
- Kubernetes auditing guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The post described checking for a Pod Security Admission validating webhook. PSA is a built-in admission controller, not a validating webhook, so the verification commands were replaced with a version check and a server-side dry-run smoke test in a restricted namespace.
- The Kubernetes 1.22 enablement example only set the `PodSecurity` feature gate. Because PSA was alpha in 1.22, the example now also enables the `PodSecurity` admission plugin.
- A namespace-label comment said the `warn: restricted` label warned about baseline violations. It now correctly says restricted violations.
- The restricted pod example implied `readOnlyRootFilesystem` is required by the Restricted Pod Security Standard. Kubernetes PSS Restricted does not require read-only root filesystems, so the comment now marks it as optional hardening beyond the Restricted profile.
- The audit-log command assumed API server container logs could be queried with `kubectl logs`. Kubernetes audit events are persisted through configured audit backends, so the example now targets the API server log audit backend and filters the official `pod-security.kubernetes.io/audit-violations` annotation.
- The exemptions section used the `pod-security.admission.config.k8s.io/v1` configuration without a version caveat. The text now notes that this example applies to Kubernetes 1.25+.
- The profile comparison diagram claimed Restricted requires read-only root filesystems and that Baseline blocks only host ports below 1024. The diagram now reflects PSS more accurately by describing Restricted allowed volume types and Baseline hostPort restrictions.

## Review Notes
The guide is technically relevant and salvageable. Server-side dry-run validation requires access to a live API server with PSA enabled, and audit-log paths vary by cluster distribution or managed Kubernetes provider.
