# Validation Summary: How to Use InPlaceOrRecreate VPA and Diagnose a Disabled InPlacePodVerticalScaling Feature Gate

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kubernetes 1.33–1.36
- Vertical Pod Autoscaler (VPA) 1.4–1.7.1
- In-place Pod vertical scaling and the Pod `/resize` subresource
- Kubernetes and VPA feature gates
- Container resize policies and Pod resize conditions
- Pod QoS, node capacity, RBAC, and PodDisruptionBudgets
- `kubectl` and Prometheus updater metrics

## Sources Consulted

- [Kubernetes in-place container resize documentation](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes 1.34 `observedGeneration` resize documentation](https://v1-34.docs.kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/#leveraging-observedgeneration-fields)
- [Kubernetes feature-gate lifecycle and GA semantics](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [KEP-1287: In-place update of Pod resources](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/1287-in-place-update-pod-resources/README.md)
- [Kubernetes `/resize` update strategy](https://github.com/kubernetes/kubernetes/blob/release-1.35/pkg/registry/core/pod/strategy.go#L368-L430)
- [Kubernetes Pod resize validation](https://github.com/kubernetes/kubernetes/blob/release-1.35/pkg/apis/core/validation/validation.go#L6214-L6351)
- [Kubernetes strategic and JSON Merge Patch behavior](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/)
- [`kubectl events` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes API-initiated eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/)
- [VPA 1.4.0 release](https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.4.0), [VPA 1.5.0 release](https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.5.0), and [VPA 1.6.0 release](https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.6.0)
- [VPA 1.7.1 release](https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.7.1)
- [VPA 1.7.1 in-place update documentation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/features.md#in-place-updates-inplaceorrecreate)
- [VPA API update-mode definitions](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go#L241-L252)
- [VPA 1.7 `InPlace` feature-gate definitions](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.0/vertical-pod-autoscaler/pkg/features/versioned_features.go)
- [VPA 1.7.1 admission validation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/admission-controller/resource/vpa/validation.go)
- [VPA 1.7.1 in-place restriction and fallback implementation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_inplace_restriction.go)
- [VPA 1.7.1 updater fallback logic](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/logic/updater.go)
- [VPA 1.7.1 eviction restriction](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_eviction_restriction.go)
- [VPA updater metric definitions on `master`](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/metrics/updater/updater.go) and [in VPA 1.7.1](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/utils/metrics/updater/updater.go)

## Issues Found

- Kubernetes 1.35 was described as merely enabling `InPlacePodVerticalScaling` by default. GA features are always enabled and cannot be disabled, so the version matrix now states that the feature is always enabled from 1.35. The component check now explicitly names the API server, scheduler, and kubelets.
- The resize-policy explanation said an explicit policy documents whether a restart is acceptable. `RestartContainer` means a restart is required for that resource resize, while `NotRequired` is not a guarantee that the container will never restart. The wording now describes the requirement semantics accurately.
- The Event command sorted on the legacy `lastTimestamp` field. It now uses the current `kubectl events --for pod/...` command to obtain recent events for the Pod directly.
- The post limited Pod and condition `observedGeneration` checks to Kubernetes 1.35+. `PodObservedGenerationTracking` is beta and enabled by default in 1.34 and can be enabled as an alpha gate in 1.33. The version guidance now reflects that lifecycle.
- The VPA fallback list omitted kubelet resize-condition errors and unrecognized resize-condition reasons, and it described fallback errors as only `/resize` request errors. VPA 1.7.1 falls back on those condition states and on any in-place update-attempt error, so the list now includes them.
- A `PodResizePending` condition was said to prove that the API and feature gate work generally. It proves the `/resize` API and the assigned node's kubelet resize path for that Pod, so the diagnosis was narrowed accordingly.
- The manual resize used JSON Merge Patch (`--type=merge`). That patch replaces the container list and can clear the example's explicit `resizePolicy`; on a multi-container Pod it can also produce an invalid shortened list. The command now uses strategic merge patch so the named container is merged and omitted fields are preserved.
- Rejection of `/resize` was attributed too narrowly to version, gate, or RBAC problems. The API can also reject admission-policy, QoS, resource, container-type, resource-removal, quota, and other validation violations. The troubleshooting text and conclusion now direct readers to inspect the server error and include admission and request validation.

## Review Notes

- The Deployment and VPA YAML are structurally valid for the documented versions. `registry.example.com/worker:2026-08-25` is an illustrative image and must be replaced with an image the cluster can pull; the `processing` namespace must already exist.
- The remaining `kubectl` commands, flags, JSONPath, and JSON patch payload are syntactically current. The `--subresource=resize` flag requires kubectl 1.32 or later, as the post states.
- All six metric names and their gauge/counter classifications match current autoscaler `master`. `vpa_updater_in_place_infeasible_skip_pods_total` is not present in the VPA 1.7.0 or 1.7.1 release source, so dashboards for released VPA 1.7.x must omit that master-only series. The post's explicit “current upstream” wording and `master` source link are accurate.
- Static CPU and memory manager policies still impose resize restrictions. Newer Kubernetes versions also expose narrowly scoped alpha feature gates for some exclusive CPU and memory cases, so behavior should be checked against the exact cluster version and gate configuration.
- All seven URLs in the post resolved to the stated official Kubernetes or autoscaler documentation/source during review. The autoscaler links use mutable `master` URLs and can drift after publication.
