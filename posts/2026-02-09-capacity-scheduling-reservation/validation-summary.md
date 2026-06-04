# Validation Summary: How to Use Capacity Scheduling for Resource Reservation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduler
- Kubernetes PriorityClass and preemption
- Kubernetes Pods and Jobs
- Kubernetes taints, tolerations, labels, and node selectors
- Kubernetes client-go
- Cluster Autoscaler
- Prometheus / PromQL
- kube-state-metrics
- Grafana dashboards

## Sources Consulted
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Taints and Tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes generated API reference for Job pod template restart policies: https://kubernetes.io/docs/reference/generated/kubernetes-api/
- Kubernetes kube-scheduler metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The scheduling overview described Kubernetes scheduling as purely first-come, first-served. Updated it to account for pod priority ordering.
- The post used absolute language saying capacity scheduling prevents fragmentation and always ensures placement. Changed this to more accurate wording because preemption and reservation improve placement probability but do not guarantee scheduling in all cases.
- The placeholder memory explanation said 16GB while the manifest requests `16Gi`. Updated the wording to 16GiB.
- The Go controller snippet used `resource.Quantity` and `resource.MustParse` without importing `k8s.io/apimachinery/pkg/api/resource`. Added the missing import.
- The dynamic controller tracked memory targets but scaled only on CPU. Updated the reconciliation condition to consider both CPU and memory targets.
- The controller-created placeholder pod did not include the reserved node selector used in the static placeholder example. Added `NodeSelector` so dynamic placeholders reserve the intended pool.
- The node pool labeling example used a partial Node manifest, which is misleading for labeling existing nodes. Replaced it with `kubectl label node` commands.
- The `large-batch-job` example omitted `restartPolicy`. Added `restartPolicy: Never`, since Job pod templates must use `Never` or `OnFailure`.
- The Cluster Autoscaler priority expander explanation said it creates reserved node pools. Updated it to say it prefers matching reserved node groups when multiple node groups can satisfy pending pods.
- The PromQL reservation query summed all resource types together. Added `resource="cpu"` filters to avoid mixing CPU, memory, and other resource units.
- The placeholder preemption metric used `rate()` on `kube_pod_status_phase` with `phase="Failed"`, which does not specifically identify preemption. Changed it to use `kube_pod_status_reason{reason="PreemptionByScheduler"}`.
- The scheduling failure query used `scheduler_schedule_attempts_total{result="error"}`, which tracks scheduler internal errors rather than unschedulable pods. Changed it to `result="unschedulable"`.
- The Grafana PromQL examples used single-quoted label values inside JSON. Updated them to escaped double quotes.

## Review Notes
- The controller example is still illustrative and omits production concerns such as RBAC manifests, a `main` function, leader election, and robust scaling logic. The post now avoids syntactic errors in the shown code, but a production controller would need those additions.
- Cluster Autoscaler image tags should generally match the Kubernetes cluster minor version; the example uses v1.29.0 and should be adjusted for the target cluster version.
