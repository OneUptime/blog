# Validation Summary: How to Implement Node Overcommitment Strategies for Cost Savings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes resource requests and limits
- Kubernetes kubelet node allocatable reservations and eviction thresholds
- Kubernetes QoS classes
- Kubernetes PriorityClass, preemption, and node-pressure eviction
- Prometheus PromQL
- kube-state-metrics and cAdvisor metrics

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Reserve Compute Resources for System Daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Metrics for Kubernetes Object States: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus Query Functions: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- Corrected the core overcommitment explanation. Kubernetes does not schedule pod requests above node allocatable capacity; overcommitment is achieved by right-sizing requests and allowing total limits or potential usage to exceed capacity.
- Replaced PromQL examples that averaged `container_cpu_usage_seconds_total` directly. That metric is a counter, so the examples now use `rate()` and subqueries before `avg_over_time()` or `quantile_over_time()`.
- Replaced request comparisons that used cAdvisor quota or memory limit metrics where Kubernetes request metrics were intended. The examples now use `kube_pod_container_resource_requests` for CPU and memory request comparisons.
- Clarified kubelet reservations and eviction thresholds. `systemReserved`, `kubeReserved`, and eviction thresholds are safety and allocatable controls; they do not make the scheduler admit requests beyond allocatable capacity.
- Corrected CPU throttling PromQL. The example now divides throttled CFS periods by total CFS periods instead of dividing throttled seconds by period count.
- Tightened QoS class descriptions to match Kubernetes criteria for Guaranteed, Burstable, and BestEffort pods.
- Corrected the priority and preemption explanation. Scheduler preemption helps pending high-priority pods schedule; node-pressure eviction is handled by the kubelet and considers priority after request usage.
- Updated kube-state-metrics dashboard examples to aggregate matching capacity, allocatable, request, and memory capacity metrics by their current labels.

## Review Notes
The PromQL examples assume kube-state-metrics and cAdvisor metrics are scraped into the same Prometheus server and that container usage series include a `node` label or are relabeled with one for node-level aggregation.
