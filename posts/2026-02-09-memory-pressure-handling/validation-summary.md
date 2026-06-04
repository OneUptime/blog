# Validation Summary: How to Implement Memory Pressure Handling Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes kubelet node-pressure eviction
- Kubernetes resource requests and limits
- Kubernetes QoS classes
- Kubernetes PriorityClasses
- Kubernetes lifecycle hooks and probes
- Kubernetes PodDisruptionBudgets
- Prometheus and PromQL
- kube-state-metrics and cAdvisor metrics
- Linux cgroups

## Sources Consulted
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes reserve compute resources for system daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Container Lifecycle Hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- Corrected kubelet eviction ordering. The original post described eviction primarily as BestEffort, then Burstable, then Guaranteed. Kubernetes ranks node-pressure eviction candidates by whether usage exceeds requests, Pod priority, and usage relative to requests; QoS is a useful approximation but not the exact ranking algorithm.
- Corrected hard and soft eviction grace-period behavior. The original text implied soft evictions generally give applications their normal shutdown time. Kubernetes node-pressure eviction does not honor the pod's configured `terminationGracePeriodSeconds`; hard evictions use `0s`, and soft evictions are bounded by `evictionMaxPodGracePeriod`.
- Corrected `memory.available` explanation. Active file-backed pages are not considered available by kubelet; inactive file-backed pages are treated as reclaimable.
- Added required `spec.selector` and matching pod template labels to all `apps/v1` Deployment examples so the manifests are structurally valid Kubernetes resources.
- Corrected the JVM memory-limit explanation to account for non-heap memory instead of implying `-Xmx` alone prevents all JVM memory from exceeding the container limit.
- Corrected PriorityClass wording from "should never be evicted" to "evicted last when possible" because Kubernetes priority reduces eviction risk but does not make pods unevictable.
- Corrected PromQL examples that used `rate()` on gauge metrics or used the wrong metric for evicted pods. Evicted pods are represented by `kube_pod_status_reason`, while OOM counters can use `increase(container_oom_events_total[5m])`.
- Corrected memory leak detection from `rate()` on a gauge to `deriv()` and added explicit vector matching against memory limits.
- Replaced a `startupProbe` memory check with a `livenessProbe`, because startup probes are for startup gating and do not continuously restart containers for later memory growth. The probe was also updated to support cgroup v2 paths.
- Corrected the PodDisruptionBudget section. PDBs protect voluntary/API-initiated evictions, such as node drains, but do not protect pods from kubelet node-pressure evictions.

## Review Notes
The YAML and JSON fenced blocks were parsed locally after edits. PromQL examples remain illustrative and assume common kube-state-metrics/cAdvisor label sets; production dashboards may need label adjustments for a specific monitoring stack.
