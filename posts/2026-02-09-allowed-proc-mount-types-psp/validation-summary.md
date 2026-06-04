# Validation Summary: How to configure allowedProcMountTypes in PodSecurityPolicy

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- PodSecurityPolicy
- Pod Security Admission
- Pod Security Standards
- Kubernetes RBAC
- Pod and container securityContext
- kubectl

## Sources Consulted
- Kubernetes Pod Security Policies documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide
- Kubernetes securityContext documentation for procMount: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission namespace labels documentation: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes well-known annotations documentation for kubernetes.io/psp: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes v1.24 OpenAPI schema for policy/v1beta1 PodSecurityPolicySpec: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.24.17/api/openapi-spec/swagger.json

## Issues Found
- The post said PodSecurityPolicy was deprecated in Kubernetes 1.25. Kubernetes documentation states PSP was deprecated in Kubernetes 1.21 and removed in Kubernetes 1.25, so the introduction and conclusion were corrected.
- The migration section said only that PSP is deprecated. Since PSP is removed from current Kubernetes releases, this was changed to say it is removed from current releases.
- The `system-monitor-psp` example omitted the required `supplementalGroups` strategy from `PodSecurityPolicySpec`. Added `supplementalGroups: { rule: RunAsAny }`.
- The `default-restricted` PSP example also omitted the required `supplementalGroups` strategy. Added `supplementalGroups: { rule: RunAsAny }`.

## Review Notes
The PSP examples are only applicable to Kubernetes versions that still serve `policy/v1beta1` PodSecurityPolicy, such as v1.24 and earlier. Current Kubernetes versions should use Pod Security Admission or a third-party admission controller. Current Kubernetes documentation also notes that modern `Unmasked` procMount behavior requires user namespaces, but Kubernetes v1.12 through v1.29 did not enforce that requirement; this does not change the PSP-era examples.
