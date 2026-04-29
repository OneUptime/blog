# Validation Summary: How to Create Kubewarden Admission Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes admission control
- Kubernetes Custom Resources
- `kubectl`
- OCI-hosted WebAssembly policy modules

## Sources Consulted
- Kubewarden Quick Start: https://docs.kubewarden.io/quick-start
- Kubewarden CRD Reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden Monitor Mode Reference: https://docs.kubewarden.io/reference/monitor-mode
- Kubewarden `pod-privileged` policy repository: https://github.com/kubewarden/pod-privileged-policy
- Kubewarden `safe-labels` policy repository: https://github.com/kubewarden/safe-labels-policy
- Kubewarden `container-resources` policy repository: https://github.com/kubewarden/container-resources-policy
- Kubewarden `verify-image-signatures` policy repository: https://github.com/kubewarden/verify-image-signatures
- Kubewarden controller policy type/source definitions: https://github.com/kubewarden/kubewarden-controller/blob/main/api/policies/v1/policy.go
- Kubewarden controller policy mode validation: https://github.com/kubewarden/kubewarden-controller/blob/main/api/policies/v1/policy_validation.go

## Issues Found
- The prerequisites were too broad. I corrected them to reflect Kubewarden’s documented Kubernetes v1.21.0+ requirement for `AdmissionPolicy`, and changed the RBAC wording to require permission to manage `AdmissionPolicy` resources in the target namespace rather than implying generic namespace-admin access is always sufficient.
- The comparison table overstated who can create `AdmissionPolicy` resources. I updated it to describe delegated namespace RBAC versus cluster-scoped RBAC, which is how this is actually controlled.
- The `pod-privileged` example used an outdated module tag. I updated it to a current stable tag verified from the upstream policy repository.
- The label-enforcement example referenced `ghcr.io/kubewarden/policies/k8s-objects`, which is not the correct Kubewarden policy module for `mandatory_labels`. I changed it to the `safe-labels` policy, whose documented settings match the example.
- The resource-limits example referenced the wrong policy module and invalid settings keys (`requireLimit` and `requireRequest`). I replaced it with the `container-resources` policy and the documented `ignoreValues: true` configuration that enforces requests and limits without pinning exact quantities.
- The “audit mode” section mixed up Kubewarden features and used an invalid `verify-image-signatures` settings schema (`anyOf` / `kind: githubAction`). I corrected the section to Kubewarden’s actual `monitor` mode and used a valid `pod-privileged` policy example.
- The post claimed monitor-mode results could be checked via `PolicyViolation` events. I could not verify that behavior in Kubewarden docs or controller code, and Kubewarden documents monitor-mode visibility through policy-server logs/traces instead. I replaced the event example with monitor-mode log inspection against the policy-server deployment.
- The mode-switching section incorrectly claimed a policy can be patched from `protect` back to `monitor`. Kubewarden explicitly disallows that transition and requires deleting and recreating the policy in `monitor` mode. I corrected the commands accordingly.
- The policy status section was incomplete and imprecise. I updated the condition descriptions to match Kubewarden controller source behavior, including `PolicyServerConfigurationUpToDate`.

## Review Notes
- The policy repositories consulted are archived because Kubewarden moved policy development into the `kubewarden/policies` monorepo starting with Kubewarden 1.32.0, but the repositories still provide authoritative policy READMEs and release tags for the modules referenced here.
- Kubewarden distinguishes `monitor` mode from the separate Audit Scanner feature. `monitor` mode affects live admission decisions and logs/traces what would have happened; Audit Scanner evaluates existing cluster resources and stores results in OpenReports or PolicyReports.
