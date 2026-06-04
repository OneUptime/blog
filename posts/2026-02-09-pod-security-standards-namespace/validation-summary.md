# Validation Summary: How to configure Pod Security Standards for namespace-level enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Pod Security Standards
- Pod Security Admission
- Kubernetes namespace labels
- Kubernetes AdmissionConfiguration
- Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes admission controller configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes audit annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction said Pod Security Standards replaced Pod Security Policies in Kubernetes 1.25. Updated this to say Pod Security Admission replaced Pod Security Policies and enforces Pod Security Standards, which matches the Kubernetes documentation.
- The Baseline profile section claimed Baseline blocks pods that run as root with privilege escalation enabled. Baseline does not require `allowPrivilegeEscalation: false`; that is a Restricted control. Replaced this with Windows HostProcess and clarified capability restrictions.
- The Restricted profile section listed `readOnlyRootFilesystem` and a required SELinux context as Restricted requirements. Kubernetes Restricted does not require a read-only root filesystem, and SELinux options are constrained only if set. Removed the incorrect requirement and updated the example/prose.
- The violation example showed a Baseline rejection for `allowPrivilegeEscalation != false`. Changed it to a Restricted rejection because that control belongs to the Restricted profile.
- The monitoring section used `kubectl get events` for Pod Security audit events. Kubernetes audit annotations are audit log data, not normal Kubernetes Event API objects. Replaced the command with namespace label checks, server dry-run warning review, and Pod Security admission metrics retrieval.
- The Prometheus alert used `apiserver_admission_webhook_rejection_count` with a Pod Security webhook name. Pod Security Admission is the built-in admission controller and exposes `pod_security_evaluations_total`; updated the PromQL to use denied enforce evaluations.

## Review Notes
The remaining examples are syntactically valid YAML. Some hardening fields, such as `readOnlyRootFilesystem`, can still be useful operationally, but they are not part of the Kubernetes Restricted Pod Security Standard and were removed to avoid implying enforcement by PSS.
