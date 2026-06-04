# Validation Summary: How to Implement Custom Schedulers for Specialized Placement Logic

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes scheduler framework
- Kubernetes scheduler profiles and KubeSchedulerConfiguration
- Kubernetes device plugins and GPU extended resources
- Kubernetes Jobs and Pods
- Go
- kubectl

## Sources Consulted
- Kubernetes Scheduling Framework: https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/
- Kubernetes Scheduler Configuration: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes kube-scheduler config API v1: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes Configure Multiple Schedulers: https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/
- Kubernetes Device Plugins: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes Schedule GPUs: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes v1.29 scheduler framework interfaces: https://github.com/kubernetes/kubernetes/blob/v1.29.0/pkg/scheduler/framework/interface.go
- Kubernetes v1.29 scheduler app registration API: https://github.com/kubernetes/kubernetes/blob/v1.29.0/cmd/kube-scheduler/app/server.go
- Kubernetes v1.29 scheduler runtime registry: https://github.com/kubernetes/kubernetes/blob/v1.29.0/pkg/scheduler/framework/runtime/registry.go

## Issues Found
- The scheduler framework import path was incorrect. Replaced `k8s.io/kube-scheduler/framework` with `k8s.io/kubernetes/pkg/scheduler/framework`, which is the framework package used by Kubernetes v1.29.
- The custom plugin factory signatures were outdated. Updated both constructors to accept `context.Context`, matching the v1.29 `runtime.PluginFactory` signature.
- The score plugins returned values above the scheduler framework's expected 0-100 score range. Added `ScoreExtensions()` and `NormalizeScore()` implementations to normalize plugin scores to `framework.MaxNodeScore`.
- The `contains` helper always returned true for non-empty strings, making spot instance detection incorrect. Replaced it with explicit checks against common spot/preemptible node labels and case-normalized comparisons.
- The cost scoring code could subtract enough cost to make a score negative. Guarded the cost bonus so raw scores remain non-negative before normalization.
- The GPU memory parser returned a hardcoded value regardless of the node label. Replaced it with integer parsing so the example reflects the configured label value.
- The scheduler config snippet was mounted as a ConfigMap by the Deployment but did not define the ConfigMap resource. Wrapped the scheduler configuration in a `scheduler-config` ConfigMap and added `leaderElection.leaderElect: false` for the single-replica custom scheduler example.
- The Job pod template omitted `restartPolicy`, which is required to be `OnFailure` or `Never` for Jobs. Added `restartPolicy: OnFailure`.
- The explanation conflated scheduling and binding phases. Updated the wording to distinguish the scheduling attempt from the binding cycle.

## Review Notes
- The plugin examples remain intentionally simplified and depend on cluster-specific node labels for GPU memory, GPU generation, GPU interconnect, node cost, and spot/preemptible status.
- The examples target Kubernetes v1.29 dependencies. Kubernetes scheduler internals are not a stable external API, so future Kubernetes upgrades may require code changes.
- Go tooling was not available in the local environment, so the Go snippets were reviewed against Kubernetes source and documentation rather than compiled locally.
