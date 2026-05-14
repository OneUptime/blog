# Validation Summary: How to Manage Kyverno Policies with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno
- Flux CD
- Kubernetes
- Kustomize
- PolicyReports
- kubectl
- Flux CLI

## Sources Consulted
- Kyverno policy type overview: https://kyverno.io/docs/policy-types/overview/
- Kyverno ClusterPolicy validate rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno ClusterPolicy mutate rules: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno ClusterPolicy JMESPath filters: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kyverno cleanup policy documentation: https://release-1-15-0.kyverno.io/docs/policy-types/cleanup-policy/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The Kyverno validation examples used the deprecated `spec.validationFailureAction` field. Moved enforcement mode to each rule's `validate.failureAction`, which is the current documented location for legacy `ClusterPolicy` validation rules.
- The post did not mention that `ClusterPolicy` and `ClusterCleanupPolicy` are legacy APIs. Added a short prerequisite note explaining their Kyverno v1.18 deprecation and planned v1.20 removal.
- The `disallow-latest-tag` policy used an invalid extglob-style wildcard pattern to detect images without tags. Replaced it with Kyverno `regex_match()` checks for missing tags and explicit `latest` tags.
- The security-context mutation used `name` instead of the required conditional anchor `(name)` when applying `patchStrategicMerge` to container list items inside a Kyverno `foreach`.
- The Kustomize overlay patches targeted policies by broad annotation selector and attempted to replace `spec.validationFailureAction`, which would fail for policies without that field and for mutation/generation policies. Replaced them with targeted JSON patches for the validation rules' `validate.failureAction` fields.
- The cleanup section claimed the policy removed completed and failed Jobs, but the conditions only matched completed Jobs. Updated the wording to completed Jobs only.
- The monitoring command displayed `.spec.validationFailureAction`, which no longer reflects rule-level validation actions. Updated it to display `.spec.rules[*].validate.failureAction`.
- The `flux get kustomizations kyverno-policies` command used a name argument not shown in the current Flux CLI reference. Updated it to `flux get kustomizations`.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1` for `Alert` and the deprecated `spec.summary` field. Updated the Alert to `notification.toolkit.fluxcd.io/v1beta3` and moved the summary under `spec.eventMetadata.summary`.

## Review Notes
The Kyverno examples intentionally remain on the legacy `ClusterPolicy` and `ClusterCleanupPolicy` APIs because converting the article to the newer CEL-based `policies.kyverno.io/v1` policy resources would require a broader rewrite. The post now calls out that version-specific caveat.
