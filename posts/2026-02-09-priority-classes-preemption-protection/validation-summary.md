# Validation Summary: How to Configure Kubernetes Priority Classes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes scheduler preemption
- Kubernetes Deployments and Jobs
- Kubernetes ResourceQuota
- kubectl
- Prometheus alert rules
- kube-state-metrics

## Sources Consulted
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes PriorityClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes RBAC authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kube-state-metrics Pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The original post stated that lower-priority batch jobs can preempt critical production services. Kubernetes preemption only removes lower-priority pods for a higher-priority pending pod, so the wording was changed to refer to mis-prioritized batch jobs and resource competition.
- The original `system-critical` PriorityClass used a name prefixed with `system-`, which Kubernetes reserves for built-in critical PriorityClasses. It was changed to `platform-critical` with a user-defined priority value below the documented maximum for user-created PriorityClasses.
- The post said the default priority is always zero, but a `globalDefault` PriorityClass changes the default for newly created pods without `priorityClassName`. The explanation was updated.
- Several statements promised that priority classes always ensure resources or service availability. These were softened because scheduling still depends on node fit, quota, preemption limits, and higher-priority workloads.
- The Job example used `$(date +%Y-%m-%d)` as a direct command argument, which Kubernetes would pass literally. It was changed to run through `/bin/sh -c` so shell substitution occurs.
- The RBAC example attempted to restrict Pod creation by `priorityClassName` using `resourceNames`, but Kubernetes RBAC cannot restrict top-level `create` requests this way and does not authorize based on Pod spec fields. The invalid RBAC snippet was removed and the text now points to admission control or a policy engine for workload authorization.
- The monitoring example used the wrong kube-state-metrics pod status reason, `Preempted`. It was changed to `PreemptionByScheduler`.
- The monitoring example used a non-existent `kube_pod_spec_priority_class_name` metric. It was changed to `kube_pod_info{priority_class="production-high"}`.
- The monitoring example treated `kube_pod_status_reason` as a counter-like rate. It was changed to alert on the current count of pods reporting scheduler preemption.

## Review Notes
The Kubernetes YAML snippets parse successfully locally. `kubectl` was not installed in the review environment, so kubectl command validation was performed against the official Kubernetes command reference rather than local `--help` output.
