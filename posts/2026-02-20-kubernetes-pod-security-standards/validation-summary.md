# Validation Summary: How to Enforce Kubernetes Pod Security Standards

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Pod Security Standards
- Pod Security Admission
- Kubernetes admission controller configuration
- kubectl
- YAML manifests

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Enforcing Pod Security Standards: https://kubernetes.io/docs/setup/best-practices/enforcing-pod-security-standards/
- Kubernetes Enforce Pod Security Standards by Configuring the Built-in Admission Controller: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/

## Issues Found
- The post described `readOnlyRootFilesystem` as a required Restricted profile control. Kubernetes Pod Security Standards do not require a read-only root filesystem for the Restricted profile. Updated the overview, compliant pod comments, and common violations table to present it as an additional hardening measure instead of a PSS requirement.
- The compliance check comments said server dry-run "shows warnings" against the restricted profile. Server dry-run evaluates the namespace's active PSA labels and can either warn or reject without creating the object. Updated the comment to reflect that behavior.
- The warning label example said it checks all pods in a namespace. PSA warning labels affect future pod or workload submissions, not a retroactive scan of existing pods. Updated the comment accordingly.

## Review Notes
The examples use the current `pod-security.admission.config.k8s.io/v1` configuration API, which requires Kubernetes v1.25 or later. Local syntax validation with Ruby could not be run because Ruby is not installed in this environment.
