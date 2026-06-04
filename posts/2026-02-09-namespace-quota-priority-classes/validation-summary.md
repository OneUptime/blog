# Validation Summary: How to Configure Namespace Resource Quota for Different Priority Classes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes ResourceQuota
- Kubernetes Deployments, CronJobs, and Pods
- kubectl
- Go client-go
- Prometheus alert rules
- kube-state-metrics

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics ResourceQuota metric documentation: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/policy/resourcequota-metrics.md
- Prometheus PromQL operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- PriorityClass-scoped ResourceQuota examples included `persistentvolumeclaims`. Kubernetes only allows PriorityClass-scoped quotas to track pod-related resources such as `pods`, `cpu`, `memory`, `ephemeral-storage`, and their request/limit variants. Removed `persistentvolumeclaims` from each PriorityClass-scoped quota.
- Introductory wording implied quotas allocate or reserve a fair share of resources. ResourceQuota enforces consumption caps; it does not reserve capacity. Updated the wording to describe capping consumption and defining consumption limits.
- The quota monitoring script printed the nested `.status.hard` and `.status.used` maps instead of per-resource used/hard values. Updated the `jq` expression to report each hard resource with its corresponding used value.
- Prometheus alert expressions selected all `kube_resourcequota` series as the numerator, including `type="hard"` series. This could compare hard quota values to themselves and produce misleading alerts. Updated the numerator to `type="used"` and the denominator to `type="hard"` while preserving the existing vector match labels.

## Review Notes
The YAML examples parse successfully after the fixes. `kubectl` is not installed in the local workspace, so CLI behavior was verified against Kubernetes documentation rather than local command help.
