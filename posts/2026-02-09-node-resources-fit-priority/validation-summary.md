# Validation Summary: How to Implement Node Resources Fit Priority for Optimal Placement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduler
- KubeSchedulerConfiguration v1
- NodeResourcesFit scheduler plugin
- Scheduler scoring strategies: LeastAllocated, MostAllocated, RequestedToCapacityRatio
- Kubernetes workload manifests for Deployments and Jobs
- kubectl, jq, shell scripting, and scheduler metrics

## Sources Consulted
- Kubernetes scheduler configuration reference: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes kube-scheduler configuration API v1: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kube-scheduler command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/

## Issues Found
- The score-weight explanation said NodeResourcesFit contributed 50% of the total score. In Kubernetes scheduler profiles, enabled default plugins have their weights overridden or are added alongside the default score plugins; other default score plugins still run unless disabled. I changed the explanation to say NodeResourcesFit has the largest weight among the three configured plugins, while the final score also depends on the rest of the profile.
- The monitoring commands used `kubectl get --raw /metrics`, which queries the API server metrics endpoint, not the kube-scheduler `/metrics` endpoint. I changed the example to port-forward the scheduler pod and query `https://127.0.0.1:10259/metrics`.
- The monitoring section grepped for `node_resources_fit`, which is not the documented scheduler metric name, and used `scheduler_framework_extension_point_duration_seconds` for plugin execution time. I replaced those with documented scheduler metrics: `scheduler_unschedulable_pods` filtered by `NodeResourcesFit` and `scheduler_plugin_execution_duration_seconds` filtered by `NodeResourcesFit`.
- The placement-analysis script piped pretty-printed node JSON into `while read`, which would process one JSON line at a time and break `jq -r .name`. I changed it to iterate node names directly.
- The placement-analysis script stripped only `m` from CPU and only `Mi` from memory, which misreported valid Kubernetes quantities such as whole CPU cores and Gi memory. I updated the jq logic to convert common CPU and memory quantities before summing.
- The GPU section said the `LeastAllocated` GPU example would avoid fragmenting GPU resources. LeastAllocated considers GPU allocation but tends to spread by that resource; bin-packing behavior requires `MostAllocated` or an appropriate `RequestedToCapacityRatio` shape. I changed the wording to reflect that distinction.

## Review Notes
- The scheduler configuration snippets use the current `kubescheduler.config.k8s.io/v1` API and the documented `NodeResourcesFit.scoringStrategy` field names.
- `LeastAllocated` is correctly described as the default NodeResourcesFit scoring strategy with equal CPU and memory weights.
- The GPU examples are valid for extended resources as long as the NVIDIA device plugin or equivalent extended resource provider advertises `nvidia.com/gpu` on nodes.
