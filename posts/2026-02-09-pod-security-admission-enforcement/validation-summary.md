# Validation Summary: How to use Pod Security Admission controller for policy enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Pod Security Admission
- Pod Security Standards
- Kubernetes namespace labels
- Kubernetes admission controller configuration
- kubectl
- Kubernetes audit logging

## Sources Consulted
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes built-in admission controller configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/

## Issues Found
- The post stated that the baseline standard requires `allowPrivilegeEscalation: false`. Kubernetes documents this as a restricted-policy requirement, not a baseline requirement. I changed the baseline explanation to say these settings are recommended hardening but not required by baseline.
- The post stated that the restricted standard requires read-only root filesystems. Kubernetes Pod Security Standards do not require `readOnlyRootFilesystem: true` for restricted. I changed the wording to describe it as optional hardening and listed the actual restricted requirements.
- The monitoring commands implied Pod Security admission decisions could be viewed with `kubectl get events` and described them as webhook decisions. Pod Security Admission records audit annotations and warnings, not normal Kubernetes Events. I changed the examples to search audit log output for Pod Security annotations.
- The DaemonSet example claimed `hostNetwork: true` and `hostPID: true` are allowed by baseline. Baseline explicitly disallows host namespace sharing. I changed the namespace to `enforce: privileged` and updated the comments to say those fields require privileged enforcement or an exemption.
- The exemptions example used a built-in workload controller service account and described service account exemptions too broadly. Kubernetes documents that username exemptions apply to the authenticated requester, and cautions against exempting controller service accounts such as the ReplicaSet controller. I replaced the example username and clarified the wording.

## Review Notes
The admission controller configuration examples use `pod-security.admission.config.k8s.io/v1`, which is valid for Kubernetes v1.25 and later. The exact audit log path depends on the cluster distribution and control-plane logging setup, so operators may need to adapt the example path.
