# Validation Summary: How to Run VPA Safely for StatefulSets and Databases Without Surprise Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA) `autoscaling.k8s.io/v1`
- StatefulSets
- PodDisruptionBudgets and the Eviction API
- Kubernetes in-place Pod resize
- Database quorum, replication, and high availability
- `kubectl`

## Sources Consulted
- [Kubernetes Vertical Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/)
- [VPA 1.7.1 API reference](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/api.md)
- [VPA 1.7.1 feature documentation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/features.md)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA admission validation source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/admission-controller/resource/vpa/validation.go)
- [VPA eviction event source](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_eviction_restriction.go)
- [VPA in-place resize event and fallback source](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_inplace_restriction.go)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes Pod disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes PodDisruptionBudget guidance](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Kubernetes Pod QoS classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Kubernetes in-place container resize](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes feature gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [Kubernetes 1.35 in-place Pod resize GA changes](https://kubernetes.io/blog/2025/12/19/kubernetes-v1-35-in-place-pod-resize-ga/)
- [Kubernetes resource requests and scheduling](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes sidecar resource calculations](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#resource-sharing-within-containers)
- [Kubernetes Pod overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Kubernetes node allocatable resources](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/#node-allocatable)
- [Kubernetes kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Kubernetes KYAML enhancement proposal](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/5295-kyaml/README.md)

## Issues Found
1. **Unquoted `Off` values were parsed as booleans:** Kubernetes' YAML conversion can interpret plain `Off` as Boolean `false`, while `spec.updatePolicy.updateMode` and the container policy's `mode` are string enums. Quoted both values as `"Off"` so the VPA manifest is accepted as intended.
2. **The `minReplicas` explanation was imprecise and the PDB boundary was incomplete:** Reworded the replica-floor explanation to say that enough replicas must be alive before the VPA updater attempts eviction. Added that a PDB controls Eviction API admission but does not constrain controller-driven StatefulSet rolling updates.
3. **The controlled-rollout advice could trigger an automatic rollout:** A StatefulSet uses `RollingUpdate` by default, so applying a resource change to its Pod template can immediately start replacement. Updated the guidance to require the supported database maintenance workflow and, for a plain StatefulSet, explicit update control such as `OnDelete` before applying the template change.
4. **The in-place modes omitted compatibility and restart caveats:** Added the Kubernetes 1.33+ `InPlacePodVerticalScaling` prerequisite and its Kubernetes 1.35 GA status. Also clarified that VPA 1.7's alpha `InPlace` mode never evicts the Pod but can still restart a container when its `resizePolicy` is `RestartContainer`.
5. **The scheduling guidance considered too little of the Pod and attributed replacement creation to VPA:** Replaced the per-container/node-size wording with a check that the complete Pod's effective requests fit eligible node allocatable capacity, including sidecars, init-container scheduling calculations, Pod overhead, DaemonSet requests, and headroom. Clarified that VPA can evict the member and leave the StatefulSet's replacement unschedulable; the StatefulSet controller creates that replacement.
6. **The event command used a legacy occurrence timestamp:** Changed sorting from `.lastTimestamp` to the current, officially documented `.metadata.creationTimestamp` field.
7. **The Kubernetes 1.35 memory-downsize statement overgeneralized “best effort”:** Clarified that memory-limit decreases are permitted and that the kubelet's OOM-prevention check for a no-restart decrease is the best-effort part.

## Review Notes
- The remaining VPA and PDB API fields, resource quantities, selectors, and `kubectl` commands are current and valid.
- `EvictedByVPA` and `InPlaceResizedByVPA` are the exact VPA event reasons. `InPlaceResizedByVPA` is emitted after the `/resize` API patch succeeds, so operators should still inspect Pod resize conditions and actual container resources to confirm kubelet completion.
- `InPlace` remains an alpha VPA feature in VPA 1.7 and is disabled unless its VPA feature gate is enabled on both the admission controller and updater. The Kubernetes in-place resize capability is enabled by default from Kubernetes 1.33 and is GA from Kubernetes 1.35.
- The post's GitHub links target the mutable `master` branch. They resolve to the correct upstream resources as of validation; pinning them to a VPA release tag could improve historical reproducibility later.
