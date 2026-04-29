# Validation Summary: How to Set Up Kubewarden for Pod Security Standards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Security Standards (PSS)
- Kubernetes Pod Security Admission (PSA)
- Kubewarden `ClusterAdmissionPolicy`
- `kubectl`
- YAML policy manifests

## Sources Consulted
- Kubernetes Docs: Pod Security Standards — https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Docs: Enforce Pod Security Standards with Namespace Labels — https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubewarden Docs: Using Pod Security Admission with Kubewarden — https://docs.kubewarden.io/howtos/pod-security-admission-with-kubewarden
- Kubewarden Docs: PodSecurityPolicy migration — https://docs.kubewarden.io/howtos/psp-migration
- Kubewarden Docs: Quick start — https://docs.kubewarden.io/quick-start
- Kubewarden Docs: Audit Scanner - Policy Reports — https://docs.kubewarden.io/explanations/audit-scanner/policy-reports
- Kubewarden Controller CRD source — https://raw.githubusercontent.com/kubewarden/kubewarden-controller/main/config/crd/bases/policies.kubewarden.io_clusteradmissionpolicies.yaml
- Kubewarden policy README: pod-privileged-policy — https://github.com/kubewarden/pod-privileged-policy
- Kubewarden policy README: host-namespaces-psp-policy — https://github.com/kubewarden/host-namespaces-psp-policy
- Kubewarden policy README: user-group-psp-policy — https://github.com/kubewarden/user-group-psp-policy
- Kubewarden policy README: volumes-psp-policy — https://github.com/kubewarden/volumes-psp-policy
- Kubewarden policy README: capabilities-psp-policy — https://github.com/kubewarden/capabilities-psp-policy
- Kubewarden policy README: seccomp-psp-policy — https://github.com/kubewarden/seccomp-psp-policy

## Issues Found
1. **The post overstated coverage as a complete PSS implementation.** The original text claimed the manifests were complete Baseline/Restricted implementations, but the examples only covered selected controls. Updated the wording throughout to describe the post as Baseline- and Restricted-aligned checks instead of a full one-to-one PSS replacement.

2. **The host namespaces policy settings were incorrect.** The manifest used `hostPID`, `hostIPC`, and `hostNetwork`, but the Kubewarden policy expects `allow_host_pid`, `allow_host_ipc`, `allow_host_network`, and optionally `allow_host_ports`. Corrected the setting names and added `allow_host_ports: []` so the example actually enforces the “no host ports” check it described.

3. **The Baseline volume example contradicted Kubernetes PSS.** The original manifest allowed `hostPath` and labeled the policy as Baseline, which is wrong because Baseline forbids `hostPath`, and the `volumes-psp` allowlist shown corresponds to the Restricted volume set. Removed the incorrect Baseline claim and moved the restricted volume allowlist to the Restricted-aligned section.

4. **The Restricted capabilities example was stricter than the Kubernetes standard.** Kubernetes Restricted requires dropping `ALL` capabilities but still permits adding back `NET_BIND_SERVICE`. Updated `allowed_capabilities` to include `NET_BIND_SERVICE` so the example aligns with the documented rule.

5. **The seccomp policy example referenced the wrong module and overstated what it enforced.** `allowed-seccomp-profiles-psp` was not the correct module name for the Kubewarden seccomp policy. Replaced it with `seccomp-psp`, changed the wording from “require seccomp profile” to “restrict seccomp profiles,” and limited the example to `runtime/default`, which the policy can validate directly.

6. **The activation, test, and monitoring examples contained technical errors.** The wait condition `PolicyActive` was wrong; the CRD exposes `AdmissionPolicyActive`. The non-compliant test pod used the invalid field `runAsRoot`; it was replaced with valid security context fields. The original monitoring loop only listed pod names and did not identify violations, so it was replaced with policy-status checks and audit-scanner report commands that match Kubewarden’s documented reporting flow.

7. **Several pinned policy versions were outdated or invalid as written.** The post referenced old or non-existent tags for some policies. Updated the manifests to current released tags verified against the policy repositories: `pod-privileged v1.0.8`, `host-namespaces-psp v1.1.6`, `user-group-psp v1.1.3`, `volumes-psp v1.1.5`, `capabilities-psp v1.0.7`, and `seccomp-psp v1.0.8`.

## Review Notes
- The corrected post now accurately presents these manifests as selected Baseline- and Restricted-aligned checks, not as a full recreation of every Pod Security Standards control.
- Some Kubewarden PSP-style policies validate or mutate specific fields rather than reproducing the entire built-in PSA behavior. For full namespace-level PSS behavior, Kubewarden’s official PSA integration docs are the better reference point.
- Live cluster execution was not performed during this review because no Kubernetes cluster was attached to the workspace and `kubectl` was not installed locally. Command and manifest verification was done against official Kubernetes and Kubewarden documentation plus Kubewarden policy source/CRD definitions.
