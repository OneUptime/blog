# Validation Summary: How to Coordinate VPA with Cluster Autoscaler When Right-Sized Pods Need Larger Nodes

## Status
validated

## Post Type
Technical guide / Operations guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA) 1.7
- Cluster Autoscaler
- Kubernetes scheduler and node autoscaling
- In-place Pod vertical scaling
- PodDisruptionBudget
- DaemonSets and static Pods
- `kubectl`, `jq`, and YAML

## Sources Consulted
- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/) — provisioning signals, scheduling constraints, preconfigured Cluster Autoscaler node groups, and the DaemonSet/VPA caution.
- [Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#how-does-scale-up-work) — unschedulable-Pod detection, template-node simulation, DaemonSet and node-manifest Pod accounting, expanders, scale-up limits, and `NotTriggerScaleUp` behavior.
- [Kubernetes init containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#resource-sharing-within-containers) and [sidecar containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#resource-sharing-within-containers) — effective Pod request calculation for scheduling.
- [Kubernetes Pod-level resources](https://kubernetes.io/docs/tasks/configure-pod-container/assign-pod-level-resources/) and [Pod overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/) — Pod-level precedence and runtime overhead in scheduling calculations.
- [Kubernetes scheduler configuration](https://kubernetes.io/docs/reference/scheduling/config/#scheduling-plugins) — resource, affinity, volume, taint, topology, extended-resource, and host-port filters.
- [VPA 1.7.1 feature documentation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/features.md) — `InPlaceOrRecreate` fallback conditions and timings, alpha `InPlace` behavior, prerequisites, and infeasible-attempt caching.
- [VPA 1.7.1 API reference](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/api.md) — update-mode requirements, `maxAllowed`, `target`, and `uncappedTarget` semantics.
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md) and [global maximum example](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/examples.md#specifying-global-maximum-allowed-resources-to-prevent-pods-from-being-unschedulable) — oversized recommendations and recommender-wide per-container maximum flags.
- [VPA README](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/README.md#features-and-known-limitations) — current incompatibility with Pod-level `resources` stanzas.
- [Kubernetes in-place container resize](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/) — `PodResizePending`, `Deferred`, and `Infeasible` status semantics.
- [Kubernetes PodDisruptionBudget API](https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/) and [VPA components](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/components.md) — disruption tracking and VPA updater use of the Eviction API.
- [`kubectl events`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/) and the [Kubernetes Event API migration guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event) — current event display and deprecated `lastTimestamp` semantics.
- [VPA admission validation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/admission-controller/resource/vpa/validation.go) and [VPA feature-gate definitions](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/features/features.go) — the `InPlace` gate requirement on the admission controller and updater.

## Issues Found
1. **The node-fit formula used a simple sum of container requests.** That is incorrect for regular init containers and native sidecars, and it omitted Pod-level request precedence and static Pods launched from node manifests. Replaced it with the workload Pod's effective scheduling request, including the relevant container, Pod-level, and Pod-overhead rules, plus applicable DaemonSet and static Pod requests.
2. **The scheduling-constraint list referred to generic ports.** Ordinary container ports do not constrain node placement; host-port conflicts do. Changed `ports` to `host-port conflicts`.
3. **The capacity warning referred to the largest node rather than eligible expandable templates.** A larger node group at zero can still help even when all live nodes are smaller, while an ineligible large node cannot help. Reworded the limit around every eligible expandable node template and based caps on the largest eligible template's allocatable capacity.
4. **The in-place mode prerequisites were incomplete.** Added the shared requirement for Kubernetes 1.33+ with `InPlacePodVerticalScaling` enabled and retained the VPA 1.7 `InPlace` gate requirement on both the admission controller and updater.
5. **The `InPlaceOrRecreate` infeasible fallback was described as immediate.** Infeasibility makes a Pod eligible for fallback without the deferred or in-progress timeout, but eviction still occurs during reconciliation and remains subject to disruption checks. Changed the wording to "once infeasibility is observed."
6. **The alpha `InPlace` retry description omitted the in-memory cache behavior.** Clarified that VPA normally retries an infeasible attempt only after at least one recommended resource decreases, while an updater restart clears the cache and permits one retry.
7. **The event command sorted only on deprecated `.lastTimestamp`.** Replaced `kubectl get events --sort-by=.lastTimestamp` with the current `kubectl events` command, which accounts for modern event-series timestamps, while preserving the latest-60 display.
8. **The `uncappedTarget` interpretation was one-sided.** A difference from `target` can result from either `maxAllowed` or `minAllowed`. Clarified that only a persistently higher `uncappedTarget` indicates upper-bound clipping and that a lower value can indicate `minAllowed` raised the target.
9. **The staging check rejected any smaller group or different zone.** A smaller group is valid when the Pod fits, and node-group expanders choose among eligible groups. Changed the check to reject groups with insufficient capacity or incompatible topology.

## Review Notes
- The post's description of preconfigured node groups matches standard upstream Cluster Autoscaler behavior. Provider-specific extensions, such as managed node-pool auto-creation, can broaden that model.
- Alpha `InPlace` is specific to VPA 1.7+. Kubernetes in-place container resize is stable and enabled by default starting in Kubernetes 1.35, but the VPA documentation correctly states the broader Kubernetes 1.33+ requirement with `InPlacePodVerticalScaling` enabled.
- Current upstream VPA is not compatible with workloads that define Pod-level `spec.resources`; the post correctly includes Pod-level resources in admission-failure diagnosis rather than recommending them for VPA-managed workloads.
- The `kubectl` commands, `jq` filter, VPA resource-policy YAML, resource quantities, and all external links were checked and are valid. The log commands assume the conventional `kube-system` namespace and Deployment names; installations with different names must adjust them.
