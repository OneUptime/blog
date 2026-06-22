# Validation Summary: How to Configure Pod Priority and Preemption in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes scheduler priority and preemption
- Kubernetes ResourceQuota and LimitRange
- Kubernetes PodDisruptionBudget
- kubectl
- Prometheus / PromQL
- kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes API reference: PriorityClass v1 - https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes documentation: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes API reference: Event v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes kubectl reference: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: Metrics for Kubernetes Object States - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The custom PriorityClass example used `system-critical`. Kubernetes reserves the `system-` prefix for built-in critical PriorityClasses, so this was changed to `cluster-critical`.
- The LimitRange section was titled as priority-based even though LimitRange does not select by PriorityClass. The heading was changed to `Namespace Limit Ranges`.
- The pending-pods PromQL used `kube_pod_spec_priority_class`, which is not a current kube-state-metrics pod metric. It now joins `kube_pod_status_phase` with `kube_pod_info`, which exposes the `priority_class` label.
- The preemption PromQL used `kube_pod_container_status_terminated_reason{reason="Preempted"}`, which is not a reliable way to detect scheduler preemption. It now uses `kube_pod_status_reason{reason="PreemptionByScheduler"}` from kube-state-metrics.
- The resource usage PromQL grouped `container_memory_usage_bytes` by `priority_class`, but that metric does not normally carry a `priority_class` label. It now joins container memory usage to `kube_pod_info`.
- The troubleshooting sort command used comma delimiters even though the custom-columns output is whitespace-separated. It now sorts on the third whitespace-separated column.
- The PDB wording implied PDBs fully protect workloads from preemption. Kubernetes only respects PDBs during preemption on a best-effort basis, so the PDB examples and recommendations were adjusted.

## Review Notes
- The Kubernetes API versions used in the examples are current and non-deprecated.
- The `kubectl get events --field-selector reason=...` examples are syntactically valid, but Kubernetes events are best-effort and retained for a limited time, so long-term alerting should rely on a monitoring pipeline rather than only the live Events API.
