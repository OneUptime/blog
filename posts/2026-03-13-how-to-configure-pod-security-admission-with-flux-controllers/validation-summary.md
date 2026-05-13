# Validation Summary: How to Configure Pod Security Admission with Flux Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Pod Security Admission
- Pod Security Standards
- Flux
- Flux Kustomization
- Kustomize
- kubectl

## Sources Consulted
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes seccomp tutorial: https://kubernetes.io/docs/tutorials/security/seccomp/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux security documentation: https://fluxcd.io/flux/security/

## Issues Found
- Removed `force: true` from the normal Flux Kustomization example. Flux documents `.spec.force` as a recreate behavior for immutable field patch failures, not as a general mechanism for overwriting labels.
- Replaced the `kubectl logs -n kube-system -l component=kube-apiserver | grep "pod-security"` audit-log command. Kubernetes PSA audit mode adds annotations to Kubernetes audit events, which are persisted through the configured audit backend, not reliably exposed through `kubectl logs` for kube-apiserver pods.
- Clarified the existing-pod behavior. PSA enforcement does not evict running pods when namespace labels change, and Kubernetes returns warnings when an `enforce` label is added or changed.
- Updated the namespace-label troubleshooting guidance to rely on Flux's default reconciliation of declared fields instead of recommending `force: true`.

## Review Notes
The PSA labels, modes, policy levels, version labels, Kubernetes v1.25 stability note, Flux restricted-profile claim, and Kustomize patch examples are technically accurate based on the consulted documentation. Local `kubectl` was not installed in the review environment, so kubectl command validation was performed against official Kubernetes documentation rather than local CLI help output.
