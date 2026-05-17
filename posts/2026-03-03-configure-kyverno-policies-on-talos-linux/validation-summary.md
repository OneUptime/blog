# Validation Summary: How to Configure Kyverno Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno (Kubernetes policy engine)
- Talos Linux
- Kubernetes (ClusterPolicy, NetworkPolicy, ResourceQuota, Deployment, Pod, etc.)
- Helm (chart installation)
- kubectl
- jq (used for filtering policy report output)

## Sources Consulted
- Kyverno official documentation: https://kyverno.io/docs/
- Kyverno installation methods: https://kyverno.io/docs/installation/methods/
- Kyverno Helm chart values.yaml: https://github.com/kyverno/kyverno/blob/main/charts/kyverno/values.yaml
- Kyverno validate rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno mutate rules: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno generate rules: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno 1.13 release notes: https://kyverno.io/blog/2024/10/30/announcing-kyverno-release-1.13/

## Issues Found

1. **Helm install command used deprecated v2 chart parameters.** The post originally set `replicaCount=3` and `resources.requests.*` / `resources.limits.*` at the chart root level. These keys do not exist in the current Kyverno Helm chart (v3, used by Kyverno v1.10+). The chart now configures HA on a per-controller basis. I replaced the install command with the documented HA configuration that sets `admissionController.replicas=3`, `backgroundController.replicas=2`, `cleanupController.replicas=2`, and `reportsController.replicas=2`. The old resource overrides at the root level were removed because they are no longer recognised at the chart root; resource overrides in v3 must be scoped to a specific controller (for example `admissionController.container.resources.requests.cpu`) and the chart ships sensible defaults, so leaving them at the defaults is the safer change rather than guessing at new values.

## Review Notes
- `spec.validationFailureAction` (used throughout the post's policy examples) was deprecated in Kyverno 1.13 in favour of the rule-level `spec.rules[*].validate.failureAction`. The legacy field still works and is widely used in existing examples, so I did not rewrite every policy, but readers on newer Kyverno releases may want to migrate to the rule-level field eventually.
- The post's mutate example uses `+()` anchors inside the `resources.requests` and `resources.limits` objects. This is valid because the anchors are applied to object keys (memory, cpu), not to array elements. The Kyverno docs caution that `+()` should not be used for arrays/lists outside of a `foreach` statement; this example stays within that constraint.
- The `inject-logging-sidecar` example pins the fluent-bit image to `fluent/fluent-bit:latest`, which would itself be rejected by the `disallow-latest-tag` policy earlier in the post. This is a stylistic/consistency issue rather than a technical inaccuracy, and the sidecar policy excludes nothing — readers running both policies should pin a specific tag.
- The `add-standard-labels` mutation patches `metadata.labels` on Deployment/StatefulSet/DaemonSet, which sets the workload's own labels (not the pod template labels). This is technically correct for what is written, but readers may expect the labels to propagate to pods, which would require also patching `spec.template.metadata.labels`.
