# Validation Summary: How to Use Priority Classes on Talos Linux

## Status
validated

## Post Type
Tutorial / Kubernetes configuration guide

## Technologies Covered
- Talos Linux
- Kubernetes PriorityClass
- Kubernetes scheduler preemption
- Cluster Autoscaler
- Kyverno ClusterPolicy
- PrometheusRule and kube-state-metrics
- kubectl

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: Metrics For Kubernetes System Components - https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- Kubernetes scheduler source metrics definitions - https://github.com/kubernetes/kubernetes/blob/master/pkg/scheduler/metrics/metrics.go
- Kubernetes kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes Cluster Autoscaler FAQ - https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kyverno ClusterPolicy overview - https://kyverno.io/docs/policy-types/cluster-policy/overview/
- Kyverno validate rules documentation - https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The Cluster Autoscaler section overstated that an evicted pod automatically becomes unschedulable and triggers a new node. Updated the explanation to clarify that the owning controller may create a replacement pod, and Cluster Autoscaler scale-up depends on that pending pod not being below the expendable priority cutoff.
- The autoscaler snippet said `expendable-pods-priority-cutoff` only affects scale-down. Updated the comment because pods below the cutoff also do not trigger scale-up.
- The `skip-nodes-with-system-pods` comment incorrectly described a priority-based eviction behavior. Updated it to describe its actual purpose: avoiding scale-down of nodes that run non-DaemonSet, non-mirror `kube-system` pods.
- The Kyverno example used deprecated top-level `spec.validationFailureAction`. Moved enforcement to `validate.failureAction: Enforce` for each validation rule.
- The development namespace Kyverno rule would have rejected pods that omit `priorityClassName`, even though the post recommends a global default PriorityClass. Changed it to a deny rule that blocks only `critical` and `high`.
- The Prometheus alert used non-existent or incorrect kube-state-metrics names: `kube_pod_preemption_victims` and `kube_pod_spec_priority`. Updated the preemption alert to use the upstream scheduler histogram sum `scheduler_preemption_victims_sum`, and updated the pending critical pod alert to join `kube_pod_status_phase` with `kube_pod_info{priority_class=~"critical|high"}`.

## Review Notes
The post is generally accurate after the corrections. PriorityClass behavior is Kubernetes-native rather than Talos-specific, so future revisions could briefly note that the examples apply to any conformant Kubernetes cluster running on Talos Linux.
