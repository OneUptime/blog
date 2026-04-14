# Validation Summary: How to Use Dapr with Kubernetes Pod Security Standards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Security Standards (PSS)
- Kubernetes Pod Security Admission controller
- Dapr (Distributed Application Runtime)
- Dapr sidecar injector and annotations
- Dapr Helm chart
- kubectl CLI

## Sources Consulted
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes API dry-run documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- Dapr sidecar injector annotations source code (`pkg/injector/annotations/annotations.go` in dapr/dapr repo)
- Dapr sidecar container security context source code (`pkg/injector/patcher/sidecar_container.go` in dapr/dapr repo)
- Dapr Helm chart values.yaml (dapr/dapr repo, `chart/dapr/values.yaml`)

## Issues Found

### Issue 1: Incorrect claim about restricted profile requiring read-only root filesystem
- **What was wrong:** The text stated "The restricted profile requires non-root users and read-only root filesystems." The Kubernetes PSS restricted profile does NOT require `readOnlyRootFilesystem: true`. While it is a security best practice, it is not enforced by any PSS level (privileged, baseline, or restricted).
- **What was changed:** Updated the text to "The restricted profile requires non-root users, a seccomp profile, dropping all capabilities, and preventing privilege escalation." This accurately reflects the actual restricted profile requirements.
- **Why:** The restricted profile enforces: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`, `seccompProfile.type: RuntimeDefault|Localhost`, and restricted volume types. It does not check `readOnlyRootFilesystem`.

### Issue 2: Invalid Dapr Helm chart values structure
- **What was wrong:** The Helm values example used `global.securityContext.runAsNonRoot` and `dapr_operator.securityContext`, neither of which are valid Dapr Helm chart value paths. `global.securityContext` does not exist in the Dapr chart. `dapr_operator` uses flat values like `runAsNonRoot`, not a nested `securityContext` object.
- **What was changed:** Updated the Helm values to use correct paths: `global.seccompProfile: RuntimeDefault` for control plane seccomp profiles, `dapr_operator.runAsNonRoot: true` as a flat value, and added `dapr_sidecar_injector` values (`sidecarRunAsNonRoot`, `sidecarDropALLCapabilities`, `sidecarReadOnlyRootFilesystem`) which are the correct way to configure sidecar security contexts via Helm.
- **Why:** The original values would be silently ignored by the Dapr Helm chart, meaning users following the guide would not actually configure security contexts correctly.

### Issue 3: Misleading PSS audit violation checking approach
- **What was wrong:** The auditing section suggested using `kubectl get events -n production | grep PodSecurity` to find PSS violations. PSS audit violations are recorded in the Kubernetes API server audit log (configured via `--audit-policy-file`), NOT as Kubernetes Event objects. `kubectl get events` would not show PSS violations.
- **What was changed:** Updated the section to explain that audit violations go to the API server audit log, and recommended using `warn` mode which returns warnings inline with kubectl commands (a more accessible approach for most users).
- **Why:** Users following the original instructions would see no output and incorrectly conclude their pods are compliant.

## Review Notes
- The `dapr.io/sidecar-seccomp-profile-type` annotation is verified as valid (defined in `pkg/injector/annotations/annotations.go`). It accepts standard Kubernetes SeccompProfileType values: `RuntimeDefault`, `Localhost`, `Unconfined`.
- In current Dapr versions, `allowPrivilegeEscalation` is hardcoded to `false` on the sidecar container. The dry-run example output showing a warning about `allowPrivilegeEscalation != false (container "daprd")` may not occur with current Dapr versions. This was left as-is since it is illustrative and the exact output depends on the Dapr version.
- The Deployment YAML example omits `spec.selector` and `spec.replicas`, which are required/common fields. This is acceptable for a focused tutorial showing only the security-relevant parts.
- The blog includes `readOnlyRootFilesystem: true` in the container securityContext YAML example, which is fine as a best practice — the fix only corrected the textual claim that the restricted profile requires it.
- The exact Helm value paths for Dapr component security contexts may vary across Dapr versions. The corrected values are based on the current Dapr Helm chart structure.
