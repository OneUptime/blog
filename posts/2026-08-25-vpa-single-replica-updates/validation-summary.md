# Validation Summary: Why VPA Does Not Update a Single-Replica Pod

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes
- Vertical Pod Autoscaler (VPA), including VPA 1.7.x in-place update modes
- PodDisruptionBudget and the Kubernetes Eviction API
- Kubernetes controller ownership and the `/scale` subresource
- In-place Pod resource resize via the `/resize` subresource
- `kubectl`

## Sources Consulted

- [VPA FAQ: single-Pod ReplicaSet recommendations and custom-resource targeting](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/faq.md)
- [VPA API reference for `updateMode`, `minReplicas`, and `targetRef`](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/api.md)
- [VPA component flags](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/flags.md)
- [VPA feature documentation for `InPlaceOrRecreate` and `InPlace`](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/features.md)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA updater replica-group and per-object `minReplicas` source](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_restriction_factory.go)
- [VPA in-place restriction source](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_inplace_restriction.go)
- [VPA updater eviction source](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_eviction_restriction.go)
- [Kubernetes: Specifying a Disruption Budget for your Application](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Kubernetes: API-initiated Eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/)
- [Kubernetes: Resize CPU and Memory Resources assigned to Containers](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes OwnerReference API](https://kubernetes.io/docs/reference/kubernetes-api/definitions/owner-reference-v1-meta/)

## Issues Found

- The Pod owner-inspection command left its `custom-columns` expression unquoted and selected `ownerReferences[0]`. The brackets are interpreted as globs by shells such as zsh, and the first owner reference is not guaranteed to be the managing controller. The command now quotes the expression and selects the owner reference whose `controller` field is `true`.
- The post said that every matching PodDisruptionBudget must permit an eviction. The Eviction API instead supports at most one PDB selecting a Pod and rejects a Pod matched by multiple PDBs. The explanation now states that the Pod must match at most one PDB and that any matching PDB must permit the eviction.
- The post said that changing the updater-wide `--min-replicas` value affects every VPA handled by that updater. A VPA with `spec.updatePolicy.minReplicas` overrides the global value. The sentence now excludes VPAs that set their own override.

## Review Notes

- The `InPlace` mode description is correct for VPA 1.7.x, but this alpha mode requires Kubernetes 1.33 or later with `InPlacePodVerticalScaling` enabled and `--feature-gates=InPlace=true` on both the VPA admission controller and updater.
- The `kube-system` namespace and `vpa-updater` Deployment name used by the log command match the official VPA manifests; installations using different namespaces or release names must adjust the command.
- The remaining YAML, VPA API fields, PDB settings, `kubectl` commands, controller-ownership claims, `/resize` behavior, and updater disruption-budget details were verified without further changes.
