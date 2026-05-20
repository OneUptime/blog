# Validation Summary: How to Deploy Pod Security Standards with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Security Standards
- Kubernetes Pod Security Admission
- Kubernetes namespace labels
- Argo CD Applications and sync options
- Kyverno ClusterPolicy, mutation, validation, PolicyException, and PolicyReport resources
- kubectl commands

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Kyverno ClusterPolicy validation rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno mutation rules: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno PolicyExceptions: https://kyverno.io/docs/guides/exceptions/
- Kyverno PolicyReports: https://kyverno.io/docs/guides/reports/

## Issues Found
- The Baseline capabilities description said workloads must not add capabilities beyond the default set. Kubernetes documents a specific allowed Baseline set, so this was changed to "allowed Baseline set."
- The Restricted requirements listed read-only root filesystems as a requirement while noting they were recommended. Kubernetes Restricted PSS does not require `readOnlyRootFilesystem`, so this was replaced with the actual `runAsUser` non-zero requirement.
- The Kyverno validation policy used `spec.validationFailureAction: Enforce`, which current Kyverno documentation marks deprecated. It was changed to `validate.failureAction: Enforce`.
- The PolicyException example used the older `kyverno.io/v2beta1` API version. It was updated to the current `kyverno.io/v2` version shown in Kyverno documentation.
- The PolicyException section did not mention that Kyverno disables PolicyExceptions by default. A short note was added before the example.
- The audit-only rollout phase suggested checking Kubernetes Events with `reason=FailedCreate`, but PSA audit mode records audit annotations rather than rejecting pods. The command was replaced with a note to check audit logs for `pod-security.kubernetes.io/audit-violations` annotations.

## Review Notes
The Kubernetes namespace label examples are valid. The post uses `latest` for some PSS version labels, which is supported, but production clusters may prefer pinning to a specific Kubernetes minor version for predictable policy behavior.
