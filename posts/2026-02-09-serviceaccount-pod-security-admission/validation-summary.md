# Validation Summary: How to Use ServiceAccount with Pod Security Admission

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Pod Security Admission
- Pod Security Standards
- ServiceAccounts
- kubectl
- Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post incorrectly implied ServiceAccounts directly participate in PSA enforcement and that the restricted profile discourages ServiceAccount token mounting. PSA evaluates Pods and workload Pod templates, while token automounting is a ServiceAccount/Pod API behavior and security best practice. Updated the explanation and ServiceAccount wording accordingly.
- The restricted ServiceAccount example described `automountServiceAccountToken: false` as recommended by the restricted profile. Updated the comment to state it is recommended when API access is not needed.
- The token mounting Pod examples claimed restricted compliance but omitted an explicit seccomp profile. Added `seccompProfile: RuntimeDefault` at the Pod level for both examples.
- The monitoring section used Kubernetes Event queries and webhook-specific log/metric names for built-in PSA. Replaced those with PSA apiserver metric lookup, configured audit log lookup, and a Prometheus expression based on `pod_security_evaluations_total`.

## Review Notes
YAML examples were parsed successfully with PyYAML. `kubectl` was not installed in the workspace, so kubectl flag verification was performed against the official generated Kubernetes command reference.
