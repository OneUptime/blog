# Validation Summary: Why VPA Cannot Downsize Memory In Place

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes 1.33 and later in-place Pod resource resize
- Vertical Pod Autoscaler (VPA) 1.7.1
- Container CPU and memory requests and limits
- Pod Quality of Service classes
- Pod eviction and PodDisruptionBudgets
- `kubectl` and `jq`

## Sources Consulted

- [Kubernetes 1.33: Resize CPU and Memory Resources assigned to Containers](https://v1-33.docs.kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes 1.34: Resize CPU and Memory Resources assigned to Containers](https://v1-34.docs.kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes: Resize CPU and Memory Resources assigned to Containers](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes 1.35: In-Place Update of Pod Resources Graduates to GA](https://kubernetes.io/blog/2025/12/19/kubernetes-v1-35-in-place-pod-resize-ga/)
- [Kubernetes: Pod Quality of Service Classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Kubernetes: Pod resize conditions](https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/#podresizepending-and-podresizeinprogress)
- [Kubernetes API: ContainerResizePolicy](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#containerresizepolicy)
- [Kubernetes: kubectl events](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes 1.34 API deprecation guide: Event](https://v1-34.docs.kubernetes.io/docs/reference/using-api/deprecation-guide/#event)
- [Kubernetes enhancement proposal: kubectl events](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/1440-kubectl-events/README.md)
- [Vertical Pod Autoscaler 1.7.1 release](https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.7.1)
- [VPA 1.7.1 feature documentation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/features.md#in-place-updates-inplaceorrecreate)
- [VPA 1.7.1 API: ContainerControlledValues](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/api.md#containercontrolledvalues)
- [VPA 1.7.1 request-to-limit scaling implementation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/utils/vpa/limit_and_request_scaling.go)
- [VPA 1.7.1 in-place restriction implementation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_inplace_restriction.go)
- [VPA 1.7.1 updater fallback implementation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/logic/updater.go)
- [VPA 1.7.1 admission validation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/admission-controller/resource/vpa/validation.go)
- [Kubernetes: PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/#pod-disruption-budgets)

## Issues Found

- The post placed best-effort, no-restart memory-limit decreases at Kubernetes 1.35. Kubernetes 1.34 already introduced that behavior; Kubernetes 1.33 had the stricter beta limitation. Updated all three version references from 1.35+ to 1.34+ and narrowed the older limitation to 1.33.
- The fallback timeout wording implied that VPA uses Kubernetes condition transition timestamps. VPA 1.7.1 instead measures from the updater's first tracked observation of the in-place resize. Updated the wording and identified the VPA version whose source defines the five-minute and one-hour thresholds.
- The event command sorted on the deprecated Event field `.lastTimestamp`. Replaced it with the current `kubectl events` command, which orders events using current timestamp fields and is available throughout the Kubernetes versions discussed.
- The diagnostic checklist treated a lower limit as a direct VPA recommendation. VPA recommends request targets and, with `RequestsAndLimits`, derives the limit by preserving the existing request-to-limit ratio. Reworded the question to distinguish the target request from the resulting limit change.
- The diagnostic checklist used `InProgress` as though it were a reported condition. Replaced it with the exact condition and reason names: `PodResizePending` with `Deferred` or `Infeasible`, and `PodResizeInProgress`.
- The VPA documentation and source links targeted the mutable `master` branch while supporting version-specific behavior. Pinned them to the VPA 1.7.1 tag.

## Review Notes

The YAML and `jq` snippets are syntactically valid, and the remaining `kubectl` commands and flags are current. The post correctly distinguishes desired resources in the Pod spec from enacted resources in container status, preserves the immutable Pod QoS class constraint, and describes the disruption implications of `RestartContainer` and eviction. VPA's 1.7.1 feature page still describes the older no-restart memory-downsize limitation, so Kubernetes's versioned resize documentation is the authoritative source for the 1.34 behavior.
