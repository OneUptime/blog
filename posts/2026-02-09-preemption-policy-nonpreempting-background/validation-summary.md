# Validation Summary: How to Configure preemptionPolicy to NonPreemptingPriority

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass and pod priority/preemption
- Kubernetes Jobs and CronJobs
- Kubernetes Deployments and Pods
- Kubernetes Cluster Autoscaler annotations and behavior
- kube-state-metrics and Prometheus alerting
- kubectl
- Python Kubernetes client

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes API reference: PriorityClass v1 - https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes API reference: Job v1 - https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/job-v1/
- Kubernetes documentation: Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes documentation: TTL after finished Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes kubectl reference: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes labels and annotations reference: cluster-autoscaler.kubernetes.io/safe-to-evict - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Cluster Autoscaler FAQ - https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics node metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The PriorityClass comment said the default `best-effort` class could be preempted by anything. Kubernetes preemption only targets lower-priority pods, so I changed this to "higher-priority pods."
- The `NonPreemptingPodsPending` Prometheus rule filtered `kube_pod_status_phase` by `priority_class`, but standard kube-state-metrics exposes `priority_class` on `kube_pod_info`, not on `kube_pod_status_phase`. I changed the expression to join pending pod phase data with `kube_pod_info`.
- The `ClusterCapacityLow` Prometheus rule omitted the `unit="core"` label. I added it to match kube-state-metrics CPU metric labels and avoid mixing resource units.
- The `kubectl run` BusyBox example passed `sleep 3600` as arguments rather than as the container command. I added `--command` so the pod runs `sleep 3600` as intended.
- The final Job cleanup example omitted `restartPolicy`. Kubernetes Jobs only allow pod template restart policies of `Never` or `OnFailure`, so I added `restartPolicy: OnFailure`.

## Review Notes
The core explanation of `preemptionPolicy: Never` is accurate for current Kubernetes: non-preempting pods are prioritized in the scheduling queue but do not preempt lower-priority pods, and they can still be preempted by higher-priority pods. Cluster Autoscaler behavior depends on its priority cutoff configuration; the shown positive priority values are above the default expendable cutoff.
