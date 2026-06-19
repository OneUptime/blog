# Validation Summary: How to Troubleshoot OOMKilled Errors in Kubernetes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes pods, deployments, resource requests, and resource limits
- Linux cgroups v1 and v2
- Kubernetes QoS classes and node-pressure eviction
- kubectl commands including describe, top, logs, exec, debug, patch, and scale
- Prometheus / PromQL monitoring queries and alert rules
- Vertical Pod Autoscaler and Horizontal Pod Autoscaler
- Python, Node.js, and Java memory profiling/runtime configuration

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Debug Running Pods: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes Vertical Pod Autoscaler documentation: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post stated that exceeding a memory limit always causes immediate termination. Updated the explanation to reflect Kubernetes documentation: memory limits are enforced reactively through OOM kills, and termination happens when the kernel detects memory pressure.
- The cgroup examples only used cgroup v1 paths. Updated the shell commands and Python example to use cgroup v2 paths first (`memory.current` and `memory.max`) with cgroup v1 fallbacks.
- The Python graceful-degradation snippet called an undefined `clear_caches()` function. Removed that call and left the behavior as a placeholder comment plus `return True`.
- The Guaranteed QoS example only matched memory request and limit. Added matching CPU request and limit because Kubernetes requires both CPU and memory requests and limits to be set and equal for Guaranteed QoS.
- The QoS labels implied OOMKilled ordering. Updated them to describe eviction ordering under node memory pressure, which is what QoS controls.
- The Prometheus memory trend query used `rate()` on `container_memory_usage_bytes`, which is a gauge-style memory usage metric. Replaced it with `max_over_time()` for a valid over-time memory usage query.
- The emergency patch example used an empty `limits` map, which may not remove an existing memory limit through a strategic merge patch. Changed it to set the memory limit key to `null`.

## Review Notes
The post is technically relevant and useful after the corrections. Some examples remain illustrative and assume common cluster add-ons such as Metrics Server, kube-state-metrics, and cAdvisor/Prometheus scraping are installed.
