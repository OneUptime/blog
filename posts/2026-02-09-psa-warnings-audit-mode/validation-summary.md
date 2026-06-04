# Validation Summary: How to implement Pod Security Admission warnings and audit mode

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Pod Security Admission
- Kubernetes Pod Security Standards
- Kubernetes audit logging
- kubectl
- jq
- Kubernetes Namespace, Pod, ConfigMap, and CronJob manifests

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace labels for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes audit annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/
- Kubernetes auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The warning example implied a single `runAsNonRoot != true` warning for a pod that sets `runAsUser: 0`. Updated the sample warning to reference `runAsUser=0`, which matches the restricted policy requirement that containers must not set `runAsUser` to 0.
- The audit log commands implied audit events are always available from API server pod logs. Kubernetes audit events are written to the configured audit backend, such as log files or webhooks. Updated the text to explain that `kubectl logs` only applies to clusters that route audit events to API server container logs.
- The "Silencing Specific Warnings" section used a non-existent per-pod exemption label, `pod-security.kubernetes.io/exempt: "true"`. Pod Security Admission exemptions are statically configured for users, runtime classes, or namespaces. Updated the section to document known issues with ordinary annotations instead of claiming to silence PSA warnings.
- The dashboard section implied `pod_security_audit_violations` is a built-in metric. Updated the text to clarify that dashboards can use those queries after audit events are exported as metrics.
- The warning-frequency commands searched audit logs for `pod-security.kubernetes.io/warn`, but warn mode returns client-facing warnings and does not create a central warning annotation. Updated the commands to use `pod-security.kubernetes.io/audit-violations` as the central tracking source when audit is configured at the same policy level.

## Review Notes
The examples remain intentionally illustrative. Real audit log access depends on cluster distribution and audit policy configuration, especially on managed Kubernetes services where audit events are commonly exposed through provider logging rather than API server pod logs.
