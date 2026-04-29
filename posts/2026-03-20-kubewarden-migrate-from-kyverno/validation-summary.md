# Validation Summary: How to Migrate from Kyverno to Kubewarden

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Kyverno
- Kubewarden
- WebAssembly policies
- CEL
- `kubectl`
- Helm

## Sources Consulted
- Kyverno Validate Rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy type overview: https://kyverno.io/docs/policy-types/overview/
- Kyverno Disallow Privileged Containers policy: https://kyverno.io/policies/pod-security/baseline/disallow-privileged-containers/disallow-privileged-containers/
- Kyverno Require Labels policy: https://kyverno.io/policies/best-practices/require-labels/require-labels/
- Kyverno Restrict Image Registries policy: https://kyverno.io/policies/best-practices/restrict-image-registries/restrict-image-registries/
- Kyverno Policy Reports: https://kyverno.io/docs/policy-reports/background/
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden Monitor mode: https://docs.kubewarden.io/reference/monitor-mode
- Kubewarden Audit Scanner policy reports: https://docs.kubewarden.io/explanations/audit-scanner/policy-reports
- Kubewarden Quick start: https://docs.kubewarden.io/quick-start
- Kubewarden CEL policy README: https://raw.githubusercontent.com/kubewarden/policies/main/policies/cel-policy/README.md
- Kubewarden CEL policy metadata: https://raw.githubusercontent.com/kubewarden/policies/main/policies/cel-policy/metadata.yml
- Kubewarden Safe Labels policy README: https://raw.githubusercontent.com/kubewarden/policies/main/policies/safe-labels-policy/README.md
- Kubewarden Safe Labels policy metadata: https://raw.githubusercontent.com/kubewarden/policies/main/policies/safe-labels-policy/metadata.yml
- Kubewarden Trusted Repos policy README: https://raw.githubusercontent.com/kubewarden/policies/main/policies/trusted-repos-policy/README.md
- Kubewarden Trusted Repos policy metadata: https://raw.githubusercontent.com/kubewarden/policies/main/policies/trusted-repos-policy/metadata.yml
- Kubewarden Pod Privileged policy README: https://raw.githubusercontent.com/kubewarden/pod-privileged-policy/main/README.md
- Kubewarden Pod Privileged policy metadata: https://raw.githubusercontent.com/kubewarden/policies/main/policies/pod-privileged-policy/metadata.yml
- Kubernetes Validating Admission Policy: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy
- Kubernetes CEL reference: https://kubernetes.io/docs/reference/using-api/cel

## Issues Found
- The Kyverno examples used deprecated `spec.validationFailureAction` fields. I moved enforcement to `spec.rules[*].validate.failureAction`, which is the current Kyverno recommendation.
- The Kyverno privileged-container example only checked `spec.containers`. I updated it to also cover `initContainers` and `ephemeralContainers`, matching Kyverno’s official policy and the stated behavior.
- Several Kubewarden mappings were incorrect or outdated. I replaced the old `pod-privileged` version, removed the nonexistent `require-resources` policy mapping, and switched the label and image-registry examples to current Kubewarden policies (`safe-labels`, `trusted-repos`, and `cel-policy` where appropriate).
- The side-by-side migration script attempted to patch a Kubewarden policy from `protect` to `monitor`, which Kubewarden does not allow. I corrected the workflow so the policy must be created in `monitor` mode up front.
- The post claimed Kubewarden monitor results could be checked via Kubernetes `PolicyViolation` events. Current Kubewarden docs instead direct users to monitor traces/metrics and audit reports, so I replaced that guidance with current audit-report commands.
- The Kyverno inventory and removal commands used unqualified CRD resource names. I qualified them as `*.kyverno.io` resources to make the commands explicit and unambiguous.

## Review Notes
- Kyverno currently documents `ClusterPolicy` as a legacy/deprecated policy type in newer releases. This post is still useful for migrations from existing legacy Kyverno policies, but it does not cover Kyverno’s newer `policies.kyverno.io` policy types.
- Kubewarden Audit Scanner stores results in OpenReports `Report` and `ClusterReport` resources by default starting with Kubewarden 1.33. Older `PolicyReport` CRDs remain possible only if explicitly configured.
