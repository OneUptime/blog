# Validation Summary: How to Write Kyverno Validate Policies for Pod Security Standards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Pod Security Standards
- Kyverno ClusterPolicy validate rules
- Helm
- kubectl
- Policy Reporter

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kyverno validation rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Helm installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno sample policy for Require runAsNonRoot: https://kyverno.io/policies/pod-security/restricted/require-run-as-nonroot/require-run-as-nonroot/
- Kyverno sample policy for Restrict Seccomp (Strict): https://kyverno.io/policies/pod-security/restricted/restrict-seccomp-strict/restrict-seccomp-strict/
- Kyverno sample policy for Disallow Capabilities: https://kyverno.io/policies/pod-security/baseline/disallow-capabilities/disallow-capabilities/
- Kyverno sample policy for Disallow hostPath: https://kyverno.io/policies/pod-security/baseline/disallow-host-path/disallow-host-path/
- Kyverno sample policy for Disallow hostPorts: https://kyverno.io/policies/pod-security/baseline/disallow-host-ports/disallow-host-ports/
- Policy Reporter Helm getting started documentation: https://kyverno.github.io/policy-reporter/guide/getting-started/

## Issues Found
- The `require-run-as-nonroot` policy was labeled as Baseline, but `runAsNonRoot` is a Restricted Pod Security Standard requirement. Changed the category annotation to Restricted.
- The original `require-run-as-nonroot` policy used optional security context anchors in a way that allowed containers without `securityContext.runAsNonRoot: true` to pass. Replaced it with an `anyPattern` that requires either pod-level `runAsNonRoot: true` or explicit `runAsNonRoot: true` on every container type.
- The examples used the deprecated top-level `spec.validationFailureAction`. Moved enforcement settings to `spec.rules[*].validate.failureAction`, as documented by Kyverno.
- The Baseline capabilities allow-list omitted several Kubernetes Pod Security Standards allowed capabilities. Updated the message and policy values to include `AUDIT_WRITE`, `FSETID`, `KILL`, `MKNOD`, `SETFCAP`, `SETPCAP`, and `SYS_CHROOT`.
- The hostPath section described blocking sensitive host paths, but Baseline forbids all `hostPath` volumes. Updated the wording to match the standard.
- The Restricted profile section claimed to enforce seccomp, AppArmor, and SELinux settings, but the policy only checked seccomp. Updated the text to describe seccomp only and expanded the policy to cover containers, init containers, and ephemeral containers.
- The bundled host-port rule used a negation anchor, which disallowed the field entirely. Baseline permits `hostPort` to be unset or `0`; changed the rule to require `hostPort: 0` when the field is present.
- The Policy Reporter command installed only the default chart configuration while claiming to provide a dashboard. Updated the command to enable the UI and added the documented port-forward command.

## Review Notes
The post remains a focused tutorial rather than a complete implementation of all Baseline or Restricted controls. Kyverno also provides built-in Pod Security validation support and curated sample policies, which could be mentioned in a future expansion, but the corrected examples are technically valid for the tutorial scope.
