# Validation Summary: How to Implement Kyverno Mutation Policies

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Kyverno (admission controller / policy engine)
- Kubernetes (admission webhooks, ClusterPolicy, PolicyException)
- Helm (chart installation)
- JSON Patch (RFC 6902 / RFC 6901 JSON Pointer)
- Strategic Merge Patch (Kubernetes)
- JMESPath (used in Kyverno context variables)
- OpenTelemetry Collector (used as the sidecar injection example)
- kubectl (CLI operations)

## Sources Consulted
- Kyverno mutate rules documentation — https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno installation methods — https://kyverno.io/docs/installation/methods/
- Kyverno policy settings reference — https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno PolicyException documentation — https://kyverno.io/docs/exceptions/
- Kyverno v1.11.0 release assets on GitHub (verified the CLI tarball URL resolves) — https://github.com/kyverno/kyverno/releases/tag/v1.11.0
- RFC 6901 (JSON Pointer escaping rules for `/` → `~1`)
- RFC 6902 (JSON Patch operations)

## Issues Found

1. **Invalid Helm value `replicaCount=3`.** The Kyverno Helm chart has no top-level `replicaCount` value — replica counts are set per-component (`admissionController.replicas`, `backgroundController.replicas`, `reportsController.replicas`, etc.). The flag would be silently ignored. **Fix:** Replaced the `--set replicaCount=3` flag with explicit `backgroundController.replicas=2` and `reportsController.replicas=2` alongside the existing `admissionController.replicas=3` to match the chart's component-based configuration model.

2. **Misleading comment on `schemaValidation: false`.** The post's Phase 3 example uses `schemaValidation: false` with the comment "Scan existing resources." This is incorrect: `schemaValidation` controls whether Kyverno validates a policy against the Kubernetes OpenAPI schema, and is deprecated as of Kyverno 1.11. Background scanning of existing resources is controlled solely by `background: true`. **Fix:** Removed the `schemaValidation: false` line and the misleading comment, and clarified the comment to explain what `background: true` actually does.

3. **Non-existent `policies.kyverno.io/disable` annotation.** The Rollback Strategy section instructed readers to disable a policy by setting an annotation `policies.kyverno.io/disable=true`. Kyverno does not implement such an annotation — applying it would have no effect. **Fix:** Replaced the bogus annotate commands with the two officially documented approaches: (a) creating a `PolicyException` (apiVersion `kyverno.io/v2`) to exempt specific resources, and (b) patching `spec.admission` and `spec.background` to `false` to halt admission processing and background scans. The emergency delete command was retained.

## Review Notes

- The post uses `validationFailureAction: Audit` in mutation-only policies. Strictly speaking, that field governs validation-rule behavior and has no effect on mutate rules, but Kyverno's own examples commonly include it on policy specs that contain only mutate rules and the API accepts it, so this is conventional rather than incorrect. Note that in newer Kyverno APIs the field is being renamed to `failureAction`.
- The Kyverno CLI install example pins v1.11.0. The download URL was verified to resolve (HTTP 200 with the expected filename), but v1.11 is older than current releases — readers may want to substitute a newer version. The general install pattern is still correct.
- The JSON Pointer escape note (`~1` for `/`) is correct per RFC 6901.
- The image rewriting policy relies on Kyverno's `images.containers.<name>.path` / `.tag` variables and uses nested templating; this works in current Kyverno but is sensitive to image-reference shape (digest-pinned images, custom registries already present). Out of scope for this validation pass.
- The `foreach` + `patchStrategicMerge` shape and the `+()` add-if-missing anchor usage match current Kyverno documentation.
- The `automountServiceAccountToken: false` setting in the production example is at the Pod spec level (correct), but be aware applying it cluster-wide can break workloads that legitimately need API access.
