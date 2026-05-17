# Validation Summary: How to Configure Vertical Pod Autoscaling on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Vertical Pod Autoscaler (VPA) — `autoscaling.k8s.io/v1`
- Horizontal Pod Autoscaler (HPA)
- Helm (Fairwinds VPA chart)
- Pod Disruption Budgets (`policy/v1`)
- kubectl

## Sources Consulted
- kubernetes/autoscaler VPA v1 API types: https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go
- VPA installation docs: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- Kubernetes VPA concept docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Fairwinds Helm chart index: https://charts.fairwinds.com/stable/index.yaml (verified `vpa` chart exists, current version 4.11.0)
- Artifact Hub package listing for `fairwinds-stable/vpa`
- VPA deprecation note for `Auto` mode: https://github.com/kubernetes/autoscaler/issues/8424

## Issues Found
- **Deprecated `updateMode: "Auto"`.** The current `autoscaling.k8s.io/v1` API marks the `Auto` value as deprecated in favor of explicit modes such as `Recreate`, `Initial`, or `InPlaceOrRecreate`. The blog described VPA as having "three modes" with `Auto` as the canonical eviction mode and used `updateMode: "Auto"` in two of its example manifests.
  - **Fix:** Replaced `updateMode: "Auto"` with `updateMode: "Recreate"` in the two YAML examples (single-deployment and multi-container examples). Updated the prose describing modes to note that `Auto` is now a deprecated alias for `Recreate`, and added a brief mention of the newer `InPlaceOrRecreate` and `InPlace` modes that are available behind feature gates. Updated the HPA/VPA conflict guidance and the summary to refer to `Recreate` instead of `Auto`.

## Review Notes
- Verified the Fairwinds Helm chart reference (`fairwinds-stable/vpa` at `https://charts.fairwinds.com/stable`) is correct — chart `vpa` is published there (current `appVersion` 1.6.0).
- `./hack/vpa-up.sh` is the correct installer path under `vertical-pod-autoscaler/` in the kubernetes/autoscaler repo.
- VPA recommendation status fields (`lowerBound`, `target`, `uncappedTarget`, `upperBound`) match the API.
- Per-container `mode: "Off"` in `containerPolicies`, `controlledResources`, and `controlledValues: RequestsAndLimits` all match the API.
- `EvictedByVPA` is the correct event reason emitted by the updater.
- The default `updateMode` (when unspecified) is now `Recreate`, not `Auto`. The post does not assert a default value, so no change was needed there.
- The newer in-place modes (`InPlace`, `InPlaceOrRecreate`) require the cluster `InPlacePodVerticalScaling` feature gate plus VPA-level feature gates on admission/updater; readers using current Talos/Kubernetes versions may want to explore these for less disruptive resizing.
