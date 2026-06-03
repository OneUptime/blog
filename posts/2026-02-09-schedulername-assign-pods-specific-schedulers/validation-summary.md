# Validation Summary: How to Configure schedulerName to Assign Pods to Specific Schedulers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and Deployments
- Kubernetes kube-scheduler
- KubeSchedulerConfiguration v1
- Kubernetes scheduler plugins and profiles
- Kubernetes RBAC
- Kubernetes MutatingAdmissionWebhook
- kubectl
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Kubernetes Scheduler Configuration: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes Configure Multiple Schedulers: https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/
- Kubernetes kube-scheduler command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
- Kubernetes kube-scheduler Configuration v1 API reference: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes Resource Bin Packing: https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/
- Kubernetes Pods documentation, Pod update and replacement: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/

## Issues Found
- The custom scheduler Deployment used `--scheduler-name=custom-scheduler` with `kube-scheduler`. Current kube-scheduler configuration is profile-based, and the official command reference does not list a `--scheduler-name` flag. Removed the flag and relied on `profiles[].schedulerName` in `KubeSchedulerConfiguration`.
- The cost optimizer scheduler command also passed `--scheduler-name=cost-optimizer` despite already using a scheduler profile in the config. Removed the redundant flag so the example matches the config-driven scheduler model.
- The custom scheduler RBAC only bound `system:kube-scheduler`. The official multiple scheduler example also grants `system:volume-scheduler`, which is needed for scheduler volume-binding behavior. Added a `ClusterRoleBinding` for `system:volume-scheduler`.
- The latency-sensitive Deployment had a selector for `app: trading-engine` but the pod template did not include matching labels. Added `template.metadata.labels` so the Deployment selector matches its template.
- The bin-packing scheduler used `MostAllocated` and `NodeResourcesLeastAllocated` as scheduler plugin names. Current Kubernetes implements bin packing through the `NodeResourcesFit` plugin with `scoringStrategy.type: MostAllocated`. Replaced the old plugin-style snippet with a valid `NodeResourcesFit` plugin configuration.
- The fallback controller Deployment had a selector for `app: scheduler-fallback` but the pod template did not include matching labels. Added `template.metadata.labels` so the Deployment selector matches its template.
- The fallback comment said the controller changes `schedulerName` after timeout. Pod updates cannot generally change fields outside the documented mutable set, so `schedulerName` is not a normal mutable fallback target. Updated the comment to say the controller recreates pods with the fallback scheduler.

## Review Notes
- Several examples reference placeholder custom plugins and images, such as `SpotInstancePriority`, `NetworkLatencyFilter`, `NetworkLatency`, `cost-optimizer-scheduler:v1.0`, and `scheduler-fallback:v1.0`. These are acceptable as conceptual custom scheduler examples, but they require actual scheduler framework plugin implementations or custom controller images to run.
- The ServiceMonitor example assumes Prometheus Operator is installed. kube-scheduler serves on secure port `10259`, so production scraping may also need HTTPS, TLS, and authentication settings depending on cluster configuration.
