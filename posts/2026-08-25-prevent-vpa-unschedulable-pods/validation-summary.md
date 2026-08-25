# Validation Summary: Prevent VPA Recommendations from Making Pods Unschedulable

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes
- Vertical Pod Autoscaler (VPA)
- kube-scheduler
- Cluster Autoscaler and node autoscaling
- LimitRange and ResourceQuota admission controls
- kubectl and server-side dry-run

## Sources Consulted

- [Upstream VPA API reference](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/docs/api.md)
- [Upstream VPA known limitations](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/docs/known-limitations.md)
- [Upstream VPA global maximum and LimitRange examples](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/docs/examples.md)
- [Upstream VPA features and CPU Startup Boost](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/docs/features.md)
- [Upstream VPA component flags](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/docs/flags.md)
- [Upstream VPA Pod-level resource limitation](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/README.md)
- [Kubernetes Node Allocatable](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/#node-allocatable)
- [Kubernetes init-container resource accounting](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#resource-sharing-within-containers)
- [Kubernetes sidecar-container resource accounting](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#resource-sharing-within-containers)
- [Kubernetes Pod overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Kubernetes LimitRange](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes ResourceQuota](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md)
- [Kubernetes API server-side dry-run semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [kubectl create reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/)
- [Kubernetes Event field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/#list-of-supported-fields)
- [Kubernetes Event API migration guidance](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event)
- [kubectl events reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes KYAML KEP covering YAML scalar coercion](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/5295-kyaml/README.md)

## Issues Found

- The VPA YAML used bare `Off` values for two string enum fields. Kubernetes YAML decoding can coerce bare `Off` to boolean `false`, which does not satisfy the VPA CRD schema. Quoted both values as `"Off"`.
- The node-fit calculation omitted effective init-container requests and RuntimeClass Pod overhead, and referred only to excluded sidecars rather than every fixed concurrently running container. Updated the calculation to use Kubernetes's full effective Pod request before comparing it with remaining node capacity.
- The text claimed that clipping a recommendation prevents an unschedulable Pod. A per-container cap cannot guarantee whole-Pod schedulability, so the wording now states only that the individual recommendation stays within its cap.
- The post did not account for the alpha CPU Startup Boost path, whose temporary request is not capped by recommendation `maxAllowed`. Documented the separate `--max-allowed-cpu-boost` flag and required the boosted request to be included in the envelope when that feature is enabled.
- The event command sorted on legacy `lastTimestamp`. Replaced it with the current `kubectl events` command, which sorts recent events using the appropriate available event timestamp.
- The LimitRange wording could imply that the recommender's status is capped directly. Clarified that VPA tries to conform the requests and limits when applying a recommendation, subject to explicit VPA resource-policy precedence.
- The admission dry-run guidance considered only maximum requests even though VPA normally scales corresponding limits and those limits affect LimitRange and ResourceQuota admission. Updated the test to include resulting limits.
- A single controlled Pod recreation cannot prove placement in every zone and node pool. Updated the procedure to require separately constrained canary Pods for each required placement, while limiting a controlled recreation's conclusion to the placement it actually receives.
- The node inspection commands did not expose taints even though taints are part of the stated eligibility calculation. Added a taint-focused `kubectl get nodes` command.

## Review Notes

- Server-side dry-run exercises API defaulting, validation, and admission without persistence; it does not invoke the scheduler. The post correctly follows it with live canary or controlled-recreation testing.
- `kubectl get nodes` cannot reveal allocatable capacity for a configured node group that is currently scaled to zero. Use the autoscaler's or cloud provider's node template for those groups.
- The Cluster Autoscaler log command assumes the conventional `cluster-autoscaler` Deployment name in `kube-system`; installations may use a different workload name or namespace.
- All referenced links resolved to the intended official or upstream resources during review.
