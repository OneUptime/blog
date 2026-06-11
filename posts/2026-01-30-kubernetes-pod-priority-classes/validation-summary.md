# Validation Summary: How to Implement Kubernetes Pod Priority Classes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes scheduler priority and preemption
- Kubernetes workload APIs: Pod, Deployment, StatefulSet, DaemonSet, Job, CronJob
- Kubernetes ResourceQuota and PodDisruptionBudget
- kubectl
- Kustomize
- Kyverno mutation policy
- PrometheusRule, kube-state-metrics, and kube-scheduler metrics

## Sources Consulted
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes PriorityClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes Resource Quotas, including PriorityClass scope: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ResourceQuota API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes critical add-on scheduling: https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes well-known labels and annotations: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The introduction and summary overstated what priority classes guarantee by saying critical workloads can always get resources or maintain availability. Updated the wording to reflect that priority affects scheduling order and can trigger preemption, but does not guarantee availability.
- The priority value table incorrectly placed built-in system priority classes at `1000000000` and described `900000000 - 999999999` as system-reserved. Updated the table to state that user-defined PriorityClass values can be at or below `1000000000`, while values above that are reserved for built-in system classes.
- The CoreDNS Deployment and kube-proxy DaemonSet examples were incomplete for `apps/v1` because they lacked selectors and matching pod template labels. Added minimal selectors and labels.
- The text said custom user priority classes should use values below `1000000000`. Updated this to at or below `1000000000`, matching the Kubernetes documented allowed range.
- The critical priority class description said workloads must always run. Reworded it to describe scheduling ahead of other user workloads.
- The preemption flow and "guarantees" section implied stronger guarantees than Kubernetes provides. Updated the wording to "can be scheduled," "tries to preempt the minimum number," and "only selects victims with lower priority."
- The Job PodDisruptionBudget selector used the deprecated `job-name` label. Updated it to `batch.kubernetes.io/job-name`.
- The Prometheus alert used a non-existent `kube_pod_priority_class` metric. Updated it to join against `kube_pod_info`, which exposes the `priority_class` label in kube-state-metrics.
- The preemption-rate alert used `rate(scheduler_preemption_victims[5m])` directly on a histogram metric. Updated it to `rate(scheduler_preemption_victims_sum[5m])`.
- The ResourceQuota best-practice wording implied quotas prevent lower-priority workloads from consuming all resources. Updated it to the more accurate claim that quotas control resource consumption by priority tier.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI verification was performed against the official kubectl reference rather than local `kubectl --help`.
- All YAML code blocks in the post were parsed successfully after the corrections.
