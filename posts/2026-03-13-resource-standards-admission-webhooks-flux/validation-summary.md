# Validation Summary: How to Enforce Resource Standards with Admission Webhooks and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno (policy engine, admission webhooks)
- Flux CD (HelmRelease, Kustomization, GitRepository CRs)
- Kubernetes (ClusterPolicy, validating/mutating admission, label & security context standards)
- GitHub Actions (CI workflow for policy testing)
- Kyverno CLI (`kyverno test`, `kyverno apply`)

## Sources Consulted
- Kyverno policy settings docs (validationFailureAction casing & deprecation): https://release-1-13-0.kyverno.io/docs/writing-policies/policy-settings/
- Kyverno preconditions / operator list: https://release-1-10-0.kyverno.io/docs/writing-policies/preconditions/
- Kyverno JMESPath filters (`regex_match`, `time_now_utc`): https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kyverno Helm chart values (chart v3.x split controllers): https://raw.githubusercontent.com/kyverno/kyverno/main/charts/kyverno/values.yaml
- Kyverno releases page (CLI asset naming): https://github.com/kyverno/kyverno/releases
- Flux Kustomization API (`kustomize.toolkit.fluxcd.io/v1`): https://fluxcd.io/flux/components/kustomize/kustomization/
- Flux HelmRelease API (`helm.toolkit.fluxcd.io/v2`): https://fluxcd.io/flux/components/helm/helmreleases/
- Flux `reconcile.fluxcd.io/requestedAt` annotation usage docs (Flux v2)
- Kubernetes label syntax (label values cannot contain `:`): https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found

1. **Kyverno chart top-level `replicaCount` is not a valid field in chart v3.x.**
   - Original: `values:` block included `replicaCount: 2` at the top level alongside the per-controller `admissionController.replicas` etc.
   - The Kyverno Helm chart v3.x splits Kyverno into four separate controller Deployments and only exposes `<controller>.replicas` — a top-level `replicaCount` has no effect.
   - Fix: removed the stray `replicaCount: 2` line and moved the "HA for production" comment to `admissionController.replicas`.

2. **`validationFailureAction: enforce` (lowercase) is deprecated.**
   - Kyverno 1.9 introduced case-sensitive capitalized values `Enforce` / `Audit`; the lowercase forms were marked for removal in 1.11. The field itself is deprecated in 1.13+ in favor of per-rule `failureAction`, but capitalized values are the still-supported form for `validationFailureAction`.
   - Fix: replaced every `validationFailureAction: enforce` with `validationFailureAction: Enforce` (three policies) and updated the Best Practices bullet to use `Audit` / `Enforce`.

3. **`NotMatch` is not a valid Kyverno operator.**
   - Step 5 used `operator: NotMatch` in a `deny.conditions` block. Kyverno's documented operators are `Equals`, `NotEquals`, `AnyIn`, `AllIn`, `AnyNotIn`, `AllNotIn`, the numeric `GreaterThan*`/`LessThan*` family, and the `Duration*` family — no `Match`/`NotMatch`.
   - Regex comparisons in Kyverno preconditions are done via the JMESPath `regex_match()` filter, which returns a boolean.
   - Fix: rewrote the condition as `key: "{{ regex_match('<pattern>', '{{request.object.metadata.name}}') }}"` with `operator: Equals` and `value: false`, and added a short comment explaining the idiom.

4. **Kyverno CLI download URL was wrong.**
   - Original: `https://github.com/kyverno/kyverno/releases/latest/download/kyverno-cli_linux_x86_64.tar.gz`.
   - The actual asset filename embeds the version: `kyverno-cli_v<version>_linux_x86_64.tar.gz`. The unversioned variant does not exist, so a `curl -sL` against `latest/download/...` would 404.
   - Fix: switched to an explicit `KYVERNO_VERSION` env var (`v1.13.0`) and downloaded the versioned asset via `releases/download/${KYVERNO_VERSION}/kyverno-cli_${KYVERNO_VERSION}_linux_x86_64.tar.gz`. Confirmed the extracted binary is named `kyverno`, so the subsequent `sudo mv kyverno /usr/local/bin/` still applies.

5. **`reconcile.fluxcd.io/requestedAt` annotation does not exist on the resources Flux deploys.**
   - The mutation example in Step 4 referenced `request.object.metadata.annotations."reconcile.fluxcd.io/requestedAt"` on a Deployment. That annotation only lives on Flux's own CRs (HelmRelease, Kustomization, GitRepository) where it triggers an out-of-band reconcile; Flux does not propagate it onto the workload resources it applies, so the JMESPath lookup would resolve to empty on a Deployment.
   - Additionally, a JSON-style RFC3339 timestamp like `2026-03-13T15:30:45Z` is not a valid Kubernetes label value because labels cannot contain `:`.
   - Fix: replaced the label `reconciled-at: "{{...annotations[...]...}}"` with an annotation `admission.example.com/mutated-at: "{{ time_now_utc() }}"`, and added a brief inline comment noting why the timestamp lives in annotations instead of labels.

## Review Notes
- `apiVersion: kyverno.io/v1` for `ClusterPolicy` is still valid in current Kyverno (through 1.18). However, Kyverno 1.17 marked the legacy `ClusterPolicy` type as deprecated in favor of the new CEL-based types (`ValidatingPolicy`, `MutatingPolicy`, `GeneratingPolicy`) under `apiVersion: policies.kyverno.io/v1`. The post's use of `ClusterPolicy` is technically correct and broadly supported but readers targeting brand-new clusters may want to evaluate the CEL-based policies.
- `validationFailureAction` at the spec level is itself slated for replacement by per-rule `failureAction` in Kyverno 1.13+. The current post is still valid for 1.10–1.16 clusters; a future revision could note this.
- The `disallow-privilege-escalation` and `require-read-only-root-fs` rules iterate `spec.containers[]` but do not also cover `initContainers` or `ephemeralContainers`. This is consistent with how the Kyverno upstream PSS-baseline policies are typically scoped but worth flagging if the author wants stricter coverage.
- The CI workflow's `--resource $CHANGED` passes a newline/space-separated list of files unquoted; this happens to work because the loop body only runs when `$CHANGED` is non-empty and word-splitting is the desired behavior here, but a future hardening could iterate explicitly.
