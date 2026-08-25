# Validation Summary: Export VPA Recommendation Bounds to Prometheus

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes and CustomResourceDefinitions
- Vertical Pod Autoscaler (`autoscaling.k8s.io/v1`)
- kube-state-metrics Custom Resource State Metrics
- Prometheus and PromQL
- Kubernetes RBAC and `kubectl`

## Sources Consulted

- [kube-state-metrics v2.20.0 Custom Resource State Metrics documentation and complete VPA configuration](https://github.com/kubernetes/kube-state-metrics/blob/v2.20.0/docs/metrics/extend/customresourcestate-metrics.md)
- [kube-state-metrics v2.9.0 changelog](https://github.com/kubernetes/kube-state-metrics/blob/v2.9.0/CHANGELOG.md#v290--2023-05-23) and [v2.8.2 default-resource source](https://github.com/kubernetes/kube-state-metrics/blob/v2.8.2/pkg/options/resource.go#L27-L58)
- [kube-state-metrics CLI arguments](https://github.com/kubernetes/kube-state-metrics/blob/v2.20.0/docs/developer/cli-arguments.md) and [v2.8.0 configuration-reload changelog](https://github.com/kubernetes/kube-state-metrics/blob/v2.8.0/CHANGELOG.md#v280--2023-02-10)
- [kube-state-metrics Pod metrics](https://github.com/kubernetes/kube-state-metrics/blob/v2.20.0/docs/metrics/workload/pod-metrics.md) and [ReplicaSet metrics](https://github.com/kubernetes/kube-state-metrics/blob/v2.20.0/docs/metrics/workload/replicaset-metrics.md)
- [VPA API recommendation semantics](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/api.md#recommendedcontainerresources)
- [VPA recommender component metrics](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/utils/metrics/recommender/recommender.go), [quality metrics](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/utils/metrics/quality/quality.go), and [server routes](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/utils/server/server.go)
- [VPA Prometheus history-provider FAQ](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#how-can-i-use-prometheus-as-a-history-provider-for-the-vpa-recommender)
- [Prometheus operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching)
- Kubernetes documentation for [`kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/), [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and [`kubectl port-forward`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/)

## Issues Found

- The post incorrectly described recommender health as part of `/metrics`. Changed the text to describe the component-level and aggregate quality metrics actually exposed there; per-VPA and per-container recommendation gauges are still absent.
- The v2.9.0 history incorrectly said VPA was removed from the default resources. The built-in VPA collector was already disabled by default; v2.9.0 removed its deprecated experimental metrics. Updated the wording accordingly.
- The RBAC example omitted the required `list` and `watch` access to `customresourcedefinitions.apiextensions.k8s.io`. Added that rule and checks for both verbs on CRDs and VPA objects.
- The restart instruction was outdated because current kube-state-metrics releases reload Custom Resource State configuration-file changes. Replaced it with automatic-reload guidance and added reload errors to the log checks.
- The port-forward command runs in the foreground, so the following `curl` could not run sequentially in the same terminal. Marked the `curl` command as running in another terminal.
- The `uncappedTarget > target` query detects capping by an upper bound, not clipping at both `minAllowed` and `maxAllowed`. Narrowed the description to maximum-policy capping without changing the valid query.
- The request-comparison guidance assumed Pod request metrics carried VPA target labels. Added the required Pod owner mapping, the ReplicaSet hop for Deployment targets, normalized target labels, and explicit one-to-many matching dimensions.
- The missing-status guidance overstated what an object-level condition can explain. Clarified that `RecommendationProvided` reports object-level state only and cannot identify a missing container, resource, or optional field; also made clear that `mode: Off` refers to a `containerPolicies` entry.

## Review Notes

- The eight Custom Resource State gauge definitions, metric names, field paths, labels, quantity conversion, units, PromQL syntax, and `--storage=prometheus` explanation were verified as correct.
- kube-state-metrics v2.20.0 marks Custom Resource State Metrics as feature-frozen in favor of `resource-state-metrics`. The feature remains supported and is not yet deprecated, so the post's implementation is current but should be revisited if upstream announces deprecation.
- kube-state-metrics documents `kube_pod_container_resource_requests` as less precise than the corresponding kube-scheduler request metric. The post's kube-state-metrics comparison remains valid when the owner mapping and vector matching described in the correction are applied.
