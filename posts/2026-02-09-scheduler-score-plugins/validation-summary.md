# Validation Summary: How to Configure Scheduler Score Plugins for Custom Prioritization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduler
- KubeSchedulerConfiguration v1
- Scheduler framework score plugins
- kubectl
- Kubernetes scheduler metrics

## Sources Consulted
- Kubernetes Scheduler Configuration documentation: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes kube-scheduler Configuration v1 API reference: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes Resource Bin Packing documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes v1.36.0 scheduler source for score logging: https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/scheduler/schedule_one.go
- Kubernetes v1.28.0 scheduler default plugin source: https://github.com/kubernetes/kubernetes/blob/v1.28.0/pkg/scheduler/apis/config/testing/defaults/defaults.go

## Issues Found
- The basic configuration described three score plugins as "the defaults." Kubernetes enables additional default score plugins, including TaintToleration, NodeAffinity, PodTopologySpread, InterPodAffinity, and VolumeBinding, with some non-1 default weights. Updated the text to clarify that the listed plugins are only part of the default score set.
- NodePreferAvoidPods was listed without caveat. Kubernetes documentation marks this plugin as deprecated and recommends using taints instead. Updated the bullet to include that caveat.
- The InterPodAffinity disable example claimed it would stop considering pod affinity. Disabling InterPodAffinity only under the score extension point stops preferred affinity scoring; required affinity and anti-affinity can still run through other extension points. Updated the comment and explanation.
- The PodTopologySpread defaultConstraints example omitted `defaultingType: List`. The v1 scheduler config API requires `defaultingType` to be `List` when explicit default constraints are used. Added it.
- The monitoring commands used `kubectl get --raw /metrics`, which queries the API server metrics endpoint rather than kube-scheduler metrics. Replaced the examples with scheduler metrics endpoint examples and corrected the plugin-level metric name.
- The article said reducing a slow plugin's weight could improve performance. Scheduler plugin weights change score influence but do not reduce plugin execution cost. Updated the recommendation to disable or change expensive constraints instead.
- The `kubectl run` examples used `--requests`, which is not a current `kubectl run` flag. Replaced those commands with `--overrides` JSON that sets `resources.requests` and `schedulerName`.
- The debugging section used outdated or inaccurate log grep patterns. Updated them to match current kube-scheduler log messages such as "Calculated node's final score for pod" and "Plugin scored node for pod".

## Review Notes
- The scheduler Deployment example is intentionally minimal and still assumes the referenced ConfigMap exists and that the custom scheduler has appropriate leader election and control-plane access for the target cluster.
- Direct access to kube-scheduler metrics depends on how the cluster exposes the scheduler's secure metrics endpoint; managed clusters may require Prometheus or provider-specific access.
