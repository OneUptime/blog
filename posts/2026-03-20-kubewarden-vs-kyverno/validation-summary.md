# Validation Summary: Kubewarden vs Kyverno: Policy Engine Comparison

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes admission policy engines
- Kyverno
- Kubewarden
- Common Expression Language (CEL)
- WebAssembly (Wasm)
- Kyverno CLI
- Kubewarden `kwctl`

## Sources Consulted
- Kyverno policy type overview: https://kyverno.io/docs/policy-types/overview/
- Kyverno `ValidatingPolicy` docs: https://kyverno.io/docs/policy-types/validating-policy/
- Kyverno `MutatingPolicy` docs: https://kyverno.io/docs/policy-types/mutating-policy/
- Kyverno `GeneratingPolicy` docs: https://kyverno.io/docs/policy-types/generating-policy/
- Kyverno migration guide for CEL-based policy types: https://kyverno.io/docs/guides/migration-to-cel/
- Kyverno CLI `test` reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_test/
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden CEL documentation: https://docs.kubewarden.io/tutorials/writing-policies/CEL/intro-cel
- Kubewarden Audit Scanner docs: https://docs.kubewarden.io/howtos/audit-scanner
- Kubewarden context-aware policy docs: https://docs.kubewarden.io/1.30/explanations/context-aware-policies
- Kubewarden official `container-resources` policy README: https://github.com/kubewarden/container-resources-policy
- Kubewarden official `container-resources` policy metadata: https://raw.githubusercontent.com/kubewarden/container-resources-policy/main/metadata.yml
- Rancher Kubewarden integration docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/kubewarden
- CNCF Kyverno graduation announcement: https://www.cncf.io/announcements/2026/03/24/cloud-native-computing-foundation-announces-kyvernos-graduation/
- CNCF Kubewarden project page: https://www.cncf.io/projects/kubewarden/

## Issues Found
- The Kyverno examples used legacy `ClusterPolicy` APIs and the deprecated `spec.validationFailureAction` field. I replaced them with the current `ValidatingPolicy`, `MutatingPolicy`, and `GeneratingPolicy` APIs from `policies.kyverno.io/v1`.
- The feature table incorrectly said Kubewarden had no CEL support. I corrected this to reflect Kubewarden's official `cel-policy`.
- The feature table said Kyverno CEL support started in `v1.10+`. Official docs show CEL validate subrules started in `v1.11`, and the newer CEL-based policy types are stable in `v1.17`, so I updated that row.
- The Kubewarden examples referenced non-current or unsupported module names and settings (`resource-limits` and `add-default-limits`). I replaced them with the official `container-resources` policy and current settings schema.
- The Kubewarden `kwctl run` example used a placeholder policy that did not match the surrounding examples. I updated it to the official `container-resources` policy and clarified that `--request-path` expects an AdmissionReview request JSON.
- Several explanatory lines overstated or oversimplified authoring models, especially for Kyverno and Kubewarden. I adjusted them to reflect Kyverno's current YAML-plus-CEL model and Kubewarden's Wasm-based authoring model.
- The Kubewarden selection guidance claimed "maximum performance from compiled Wasm modules", which was not an official, verifiable product guarantee. I replaced it with a technically grounded Wasm distribution/execution statement.

## Review Notes
- Kyverno's legacy `ClusterPolicy` and `CleanupPolicy` APIs remain available, but Kyverno marks `ClusterPolicy` as deprecated in `v1.17`; the post now uses the stable CEL-based policy types instead.
- The post's folder date is `2026-03-20`, but Kyverno's CNCF graduation was announced on March 24, 2026. The post now reflects current status as of `2026-04-29`.
- The Kubewarden examples use `:latest` for the official policy module to avoid pinning obsolete tags in the article. For production use, immutable version tags or digests are still preferable.
- The standalone `kubewarden/container-resources-policy` repository is archived because policy development moved into the `kubewarden/policies` monorepo, but the documented OCI module path remains valid.
