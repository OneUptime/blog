# Validation Summary: How to Configure Pod Priority and Preemption with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Priority and Preemption
- Kubernetes PriorityClass
- Kubernetes ResourceQuota
- Kubernetes topology spread constraints
- Flux CD Kustomization
- Cluster Autoscaler priority expander
- Prometheus Operator PrometheusRule
- kube-state-metrics and kube-scheduler metrics
- kubectl and Flux CLI

## Sources Consulted
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes system metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md

## Issues Found
- Custom PriorityClass names used the reserved `system-` prefix (`system-cluster-critical`, `system-monitoring`, and `system-security`). Kubernetes reserves `system-` prefixed PriorityClass names and also ships built-in `system-cluster-critical` and `system-node-critical` classes. Renamed the custom classes to `platform-cluster-critical`, `platform-monitoring`, and `platform-security`.
- Several explanations said priority "ensures" critical workloads always get resources or that some workloads "must always" run. Kubernetes preemption has limitations and does not guarantee immediate scheduling. Reworded these statements to describe scheduling preference more accurately.
- The non-preempting `best-effort` class was described as "first to be evicted" and as running only when spare capacity exists. `preemptionPolicy: Never` only prevents those pods from preempting lower-priority pods; they may still be preempted by higher-priority pods. Updated the comments and description.
- The Cluster Autoscaler priority expander was described as prioritizing node groups based on workload priority. The priority expander ranks node groups by matching scaling group names against regular expressions, and it requires Cluster Autoscaler to run with `--expander=priority`. Updated the explanation and comments.
- The Cluster Autoscaler priority expander ConfigMap namespace was presented as fixed. The official documentation says it must be in the namespace used by Cluster Autoscaler. Added a clarifying comment.
- The monitoring example used a nonexistent `kube_pod_preemption_victims` metric. Replaced it with `scheduler_preemption_attempts_total` and adjusted the alert wording to refer to preemption attempts.
- The repository structure placed the Flux Kustomization manifest inside the target manifest directory as `priority-classes/kustomization.yaml`, which conflicts with Flux's use of the path for rendered manifests. Moved the example Flux Kustomization path to `clusters/my-cluster/flux-system/priority-classes-kustomization.yaml`.
- The Flux CLI verification command used singular `flux get kustomization`. Updated it to the documented plural form `flux get kustomizations priority-classes`.
- The PrometheusRule example requires the Prometheus Operator CRD. Added that prerequisite for users who apply the monitoring example.

## Review Notes
The YAML examples were parsed successfully after the fixes. The kubectl and Flux CLI binaries were not installed in the local environment, so command behavior was checked against documentation rather than local CLI help.
