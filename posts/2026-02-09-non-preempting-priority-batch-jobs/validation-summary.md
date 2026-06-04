# Validation Summary: How to Implement Non-Preempting Priority Classes for Best-Effort Batch Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes Pod priority and preemption
- Kubernetes Jobs and CronJobs
- Kubernetes ResourceQuota
- Kubernetes Cluster Autoscaler
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption, including non-preempting PriorityClass behavior: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes API reference: ResourceQuota v1 and scopeSelector fields: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes documentation: Resource Quotas, including PriorityClass scope resource restrictions: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes API reference: Deployment v1 selector requirements: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes documentation: Deployments, including apps/v1 selector and template label matching requirements: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes API reference: Job v1: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes documentation: CronJobs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes documentation: Node labels populated by the kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The ResourceQuota example used `requests.nvidia.com/gpu` and `persistentvolumeclaims` with a `PriorityClass` scope. Kubernetes restricts PriorityClass-scoped quotas to pod-related resources such as `pods`, CPU, memory, and ephemeral storage, so those entries would be invalid. I replaced them with a valid `pods` quota and kept CPU and memory request quotas.
- The monitoring and wait-time `jq` filters used `contains(...)` directly on `.spec.priorityClassName`. Pods without a priority class can have this field unset, which can make the filter fail. I changed the filters to use `(.spec.priorityClassName // "")`.
- The Cluster Autoscaler section implied that the ConfigMap alone configures autoscaling behavior. I clarified that Cluster Autoscaler must already be running and that the priority expander must be enabled with `--expander=priority`; the ConfigMap only controls node group preference for that expander.
- The mixed-priorities Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. I added a selector and matching `app: payment-api` template label.

## Review Notes
The non-preempting PriorityClass explanation is technically correct, including `preemptionPolicy: Never` and the fact that pending non-preempting pods are placed ahead of lower-priority pods without preempting them. Kubernetes documentation also notes that non-preempting pods are still subject to scheduler back-off and can themselves be preempted by higher-priority pods; the post does not emphasize those caveats, but its core guidance remains accurate.
