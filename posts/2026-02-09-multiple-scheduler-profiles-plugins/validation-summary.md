# Validation Summary: How to Configure Multiple Scheduler Profiles with Different Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes kube-scheduler
- KubeSchedulerConfiguration v1
- Kubernetes scheduler profiles and framework plugins
- NodeResourcesFit and PodTopologySpread plugin configuration
- Kubernetes Deployments, ConfigMaps, Services, and scheduler metrics

## Sources Consulted
- Kubernetes Scheduler Configuration: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes kube-scheduler Configuration API v1: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes Resource Bin Packing: https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kube-scheduler command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/

## Issues Found
- The default profile example manually listed a partial set of default plugins and weights, which could become inaccurate and omitted default behavior such as the current `NodeResourcesFit` score extension. Replaced it with the minimal `default-scheduler` profile, which is the documented way to use default plugins.
- The post did not mention that all scheduler profiles must use the same `queueSort` plugin and configuration. Added that caveat because kube-scheduler has a single pending Pods queue.
- The high-performance profile claimed to prioritize nodes with the most available resources but used `NodeResourcesBalancedAllocation` and configured `NodeResourcesFit` with `MostAllocated`, which favors higher allocation. Changed the score plugin to `NodeResourcesFit` and the scoring strategy to `LeastAllocated` to match the stated intent.
- The `PodTopologySpread` plugin examples configured `defaultConstraints` without `defaultingType: List`. Added `defaultingType: List`, as required when using explicit default constraints.
- The scheduler Deployment example mounted the ConfigMap at `/etc/kubernetes`, which would hide `/etc/kubernetes/scheduler.conf` referenced by the scheduler flags. Changed the mount to use `subPath` at `/etc/kubernetes/scheduler-config.yaml`.
- The scheduler log command used a placeholder pod name. Changed it to select scheduler pods by label.
- The metrics examples used non-existent metric names (`scheduler_scheduling_attempts_total` and `scheduler_scheduling_duration_seconds`) and plain HTTP against the scheduler's secure port. Changed them to port-forward the HTTPS endpoint and query `scheduler_schedule_attempts_total` and `scheduler_scheduling_attempt_duration_seconds`.

## Review Notes
The examples are accurate for the current `kubescheduler.config.k8s.io/v1` API. The scheduler Deployment manifest remains a generic example; real clusters often run kube-scheduler as a static Pod or through a managed control plane, so deployment mechanics may vary by distribution.
