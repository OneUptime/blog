# Validation Summary: How to Implement Scheduler Performance Tuning for Large Clusters

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- kube-scheduler
- KubeSchedulerConfiguration
- Kubernetes scheduling plugins and profiles
- Kubernetes scheduler metrics
- Prometheus alerting rules
- kubectl commands

## Sources Consulted
- Kubernetes Scheduler Performance Tuning: https://kubernetes.io/docs/concepts/scheduling-eviction/scheduler-perf-tuning/
- Kubernetes Scheduler Configuration: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes kube-scheduler configuration API v1: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes kube-scheduler command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Static Pods: https://kubernetes.io/docs/concepts/workloads/pods/static-pods/
- Kubernetes kubeadm implementation details: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/

## Issues Found
- The metrics examples used `kubectl get --raw /metrics`, which queries the API server metrics rather than kube-scheduler metrics. Updated the examples to use the kube-scheduler service proxy path when a scheduler Service is exposed.
- The post referenced `scheduler_scheduling_duration_seconds`, which is not the current scheduler latency metric. Replaced it with `scheduler_scheduling_attempt_duration_seconds` in the metric list and alert rule.
- The `percentageOfNodesToScore` explanation described the default as a fixed 50% and said the scheduler filters all nodes. Updated this to match Kubernetes behavior: the default is calculated from cluster size, and the scheduler can stop searching after finding enough feasible nodes.
- The scheduler configuration example claimed `LeastAllocated` was faster than `MostAllocated` and set `PodTopologySpread` `defaultingType: List` as a performance optimization. Removed the misleading topology spread setting and clarified `LeastAllocated` as the default resource scoring strategy.
- The deployment patch example replaced the scheduler command without mounting the configuration file and did not account for static Pod deployments. Replaced it with accurate guidance for Deployment-based and kubeadm/static-Pod-based scheduler setups.
- The inter-pod affinity disable example only disabled the score extension point. Updated it to use `multiPoint.disabled` so the plugin is disabled across its extension points.
- The cache section implied cache behavior could be tuned through `NodeResourcesFit` and referenced a non-existent `scheduler_cache_lookups_total` metric. Reworded the section and replaced the metric guidance with current scheduler cache and event metrics.
- The parallel scheduler section claimed multiple replicas handle higher pod creation rates and fail over instantly. Corrected it to explain that leader election leaves only one active scheduler replica, so replicas provide availability rather than throughput.
- The batch scheduler profile omitted a `default-scheduler` profile and implied custom filter lists were minimal filtering. Added the default profile and kept the focus on simpler scoring.
- The node label section claimed scheduler node-label indexes and indexed label selectors. Reworded it to focus on consistent node labels without making unsupported indexing claims.
- The debugging example used the extension-point duration metric for plugin execution timing. Updated it to use `scheduler_plugin_execution_duration_seconds`.
- The hardware guidance overstated single-thread performance. Updated it to reflect scheduler algorithm parallelism and the need for adequate CPU capacity and per-core performance.

## Review Notes
The post is technically relevant and contains implementation details. `kubectl` was not installed in the local workspace, so CLI verification was performed against official Kubernetes documentation rather than local `kubectl --help` output.
