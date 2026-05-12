# Validation Summary: How to Pause All Flux Reconciliation During Maintenance Window

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Flux CD v2 (kustomize-controller, source-controller, helm-controller)
- Kubernetes (kubectl, events, field selectors)
- Flux CLI (`flux suspend`, `flux get`)
- Bash scripting
- jq

## Sources Consulted
- Flux CD CLI documentation: https://fluxcd.io/flux/cmd/flux_suspend/
- `flux suspend source git/helm/oci` reference: https://fluxcd.io/flux/cmd/flux_suspend_source/
- `flux suspend kustomization` reference: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- `flux suspend helmrelease` reference: https://fluxcd.io/flux/cmd/flux_suspend_helmrelease/
- `flux get` reference: https://fluxcd.io/flux/cmd/flux_get/
- Kubernetes field selector docs (events `reason` field): https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Flux GitOps Toolkit API types (GitRepository, HelmRepository, OCIRepository, Kustomization, HelmRelease)

## Issues Found

1. **Step 4 — broken bash for-loop iterating Flux source types.** The script had `for resource_type in source git source helm source oci; do` which tokenises into six single words rather than three two-word pairs, and `kubectl get $(echo $resource_type | tr ' ' '')` used invalid `tr` syntax (`tr` cannot translate to an empty string without `-d`). The downstream `flux suspend $resource_type` calls would also be wrong because `$resource_type` would only ever be `source`, `git`, `helm`, `oci`, etc. Rewrote this block as five explicit kubectl→jq→flux-suspend pipelines (one per resource type), matching the style already used in Steps 2 and 3.

2. **Step 5 — incorrect verification command.** `flux get kustomizations --all-namespaces | grep -c "True"` was annotated as "Should show 0 unsuspended Kustomizations", but every row in the flux output contains `True` in either the SUSPENDED or READY column, so the count does not correspond to unsuspended kustomizations. Replaced with `kubectl get kustomizations --all-namespaces -o json | jq '[.items[] | select(.spec.suspend != true)] | length'` which correctly returns the number of kustomizations whose `spec.suspend` is not `true`.

## Review Notes
- Modern Flux CLI (v2.1+) supports `flux suspend <kind> --all -A` to suspend everything across namespaces in one command. The post's explicit kubectl→jq→loop pattern works on all Flux v2 versions, so it was kept as-is for broader compatibility.
- The illustrative `flux get kustomizations --all-namespaces` output in Step 1 omits the `REVISION` and `MESSAGE` columns that the real CLI emits. This is a harmless abbreviation; the displayed SUSPENDED/READY values are accurate, so no change was made.
- The `kubectl get events --field-selector reason=ReconciliationSucceeded` and `reason!=Pulling,reason!=Pulled` selectors are valid: `reason` is one of the field selectors Kubernetes supports on the Event resource.
- `kubectl logs -n flux-system deployment/kustomize-controller` uses the correct controller deployment name shipped by the Flux installer.
- The `while read ns name` constructs do not pass `-r`, which is a stylistic nit rather than a correctness issue for Kubernetes resource names (no backslashes possible); left untouched.
