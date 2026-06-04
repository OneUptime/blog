# Validation Summary: Troubleshoot Kubernetes Pod Security Admission Rejections After PSA Migration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Pod Security Admission
- Pod Security Standards
- kubectl
- Kubernetes manifests
- Prometheus alerting rules
- Dockerfile container image configuration

## Sources Consulted
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes built-in Pod Security Admission controller configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Local kubectl help output for `kubectl apply` and `kubectl get events`

## Issues Found
- Audit and warn behavior was described as generating Kubernetes Events. Updated the text to state that audit mode adds audit annotations to audit log events, while warn mode returns user-facing warnings.
- Commands suggested using `kubectl get events` and `reason=PodSecurityViolation` for audit violations. Replaced them with audit-log checks for the `pod-security.kubernetes.io/audit-violations` annotation.
- The capabilities example added `NET_ADMIN` and `NET_RAW` while discussing Baseline-compatible remediation. Updated the example to use `NET_BIND_SERVICE` and clarified that `NET_ADMIN`, `NET_RAW`, and `SYS_TIME` are not allowed by Baseline.
- The Restricted volume list omitted valid volume types. Updated the allowed list to include ConfigMap, CSI, DownwardAPI, EmptyDir, Ephemeral, PersistentVolumeClaim, Projected, and Secret volumes.
- The Prometheus rules used admission webhook and admission latency metrics that do not represent built-in Pod Security Admission decisions. Replaced them with `pod_security_evaluations_total` and `pod_security_exemptions_total` examples.

## Review Notes
The post remains version-sensitive because Pod Security Standards can change by Kubernetes minor version when labels use `latest`. Pinning `pod-security.kubernetes.io/<MODE>-version` labels is a useful future improvement for production examples.
