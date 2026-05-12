# Validation Summary: How to Scale Deployments Managed by Flux Without Git Changes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Flux CD v2 (kustomize-controller)
- Kubernetes Deployments
- Kubernetes HorizontalPodAutoscaler (autoscaling/v2)
- kubectl CLI
- flux CLI
- Server-side apply (SSA) and field ownership
- GitOps workflow

## Sources Consulted
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization "controlling the apply behavior" section (SSA annotation values: `Override`, `Merge`, `IfNotPresent`, `Ignore`)
- Flux FAQ: https://fluxcd.io/flux/faq/ (HPA + Flux: omit `spec.replicas` from manifests)
- Kustomize-controller repository: https://github.com/fluxcd/kustomize-controller
- Kubernetes HorizontalPodAutoscaler API reference (autoscaling/v2)
- kubectl scale subresource semantics (Deployment has `scale` subresource; HPA does not)

## Issues Found

1. **Step 2 — misleading `kubectl scale` comment (line 99-101).** The original comment claimed `kubectl scale --replicas=10 deployment/my-service` "works on HPA min replicas through the HPA object." That is incorrect — `kubectl scale` targets the Deployment's scale subresource directly. HPA does not have a scale subresource and will continue to evaluate metrics and may scale the Deployment back down. Rewrote the comment to clarify that this scales the Deployment directly and that HPA may revert the change.

2. **Step 5 — annotation value mismatch and incorrect value for the use case (lines 152, 164).** The prose described a `kustomize.toolkit.fluxcd.io/ssa: merge` annotation but the YAML example showed `IfNotPresent`. For the HPA-coexistence scenario described, `Merge` is the correct value per Flux docs ("preserves fields added by other tools to the Kubernetes resources managed by Flux"). `IfNotPresent` would prevent Flux from updating *any* field on the Deployment after initial creation — not what an actively reconciled workload wants. Updated the example to `Merge` and added a short note about `IfNotPresent` with its caveat. Also corrected casing to match Flux docs (`Merge`, `IfNotPresent`).

3. **Step 5 — bogus "field exclusion via the Kustomization" example (lines 167-183).** The original claimed `force: false` and the Kustomization spec example perform "field exclusion." That is wrong — Flux's `spec.force` controls whether resources are recreated on immutable field changes, not field exclusion. The example shown did nothing related to field exclusion (the default value of `force` is already `false`). Removed this misleading block entirely.

4. **Step 6 — title/body contradiction (lines 185-187).** Title said "Emergency Scaling via Git (the GitOps-Correct Way)" while the body opened with "For non-emergency situations." Git is the standard GitOps path, not an emergency one. Renamed the section to "Scaling via Git (the GitOps-Correct Way)" and reworded the Introduction's three-approach summary to align (Git path = standard; suspending Flux = emergency override).

## Review Notes

- The `flux suspend`, `flux resume`, `flux get kustomization`, and `flux reconcile ... --with-source` commands are all valid Flux v2 CLI invocations.
- The `autoscaling/v2` API for HorizontalPodAutoscaler is current and correct.
- The recommendation to omit `spec.replicas` from manifests when HPA manages scaling matches Flux's own FAQ guidance and is the cleanest approach.
- The `kustomize.toolkit.fluxcd.io/v1` Kustomization API is the current GA version.
- Step 5's `Merge` annotation will use 3-way merge instead of server-side apply for that object; this trades some SSA niceties (granular field ownership tracking) for compatibility with controllers that mutate Flux-managed resources. The post does not call this out — worth a future paragraph but not a correctness issue.
- The `kubectl scale` example in Step 1 demonstrates the problem (drift correction) correctly.
- The Best Practices section is sound; KEDA suggestion is reasonable.
