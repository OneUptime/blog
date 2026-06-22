# Validation Summary: How to Configure Pod Security Policies (Deprecated) and Pod Security Standards

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Pod Security Policies
- Pod Security Standards
- Pod Security Admission
- kubectl
- Kubernetes AdmissionConfiguration
- Kubernetes audit logs
- Prometheus metrics

## Sources Consulted
- Kubernetes Pod Security Policies documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes admission controller configuration for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes namespace label enforcement task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes PSP migration guide: https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/
- Kubernetes PSP to PSS mapping reference: https://kubernetes.io/docs/reference/access-authn-authz/psp-to-pod-security-standards/
- Kubernetes audit annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kubectl local help output for `apply` and `label`

## Issues Found
- Corrected the PSS/PSA version table to note that Pod Security Admission was introduced before 1.25 but became stable in Kubernetes 1.25.
- Corrected the namespace label example so the `warn` label and comment both refer to the `restricted` profile instead of warning on `baseline` while enforcing `restricted`.
- Corrected the exemptions section. Pod Security Admission exemptions are explicitly configured, not automatic built-in defaults, and controller service account exemptions are generally discouraged.
- Added the Kubernetes 1.25+ version caveat for the `pod-security.admission.config.k8s.io/v1` AdmissionConfiguration API.
- Corrected the audit log annotation from `authorization.k8s.io/audit-annotations` to `pod-security.kubernetes.io/audit-violations`.
- Corrected the Prometheus alert example to use the Pod Security metric `pod_security_evaluations_total{decision="deny"}` instead of a generic admission duration metric with unsupported labels.

## Review Notes
The PSP examples are intentionally legacy and use the removed `policy/v1beta1` API only in the pre-1.25 section, which is appropriate for the post's scope. The Pod Security examples use `latest` policy versions; pinning explicit versions such as `v1.36` can be preferable in production to avoid behavior changes during Kubernetes upgrades.
