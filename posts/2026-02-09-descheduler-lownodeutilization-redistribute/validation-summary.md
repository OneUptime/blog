# Validation Summary: How to Use Descheduler LowNodeUtilization Strategy to Redistribute Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Descheduler
- LowNodeUtilization strategy
- Kubernetes RBAC
- CronJob
- PodDisruptionBudget
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Kubernetes Descheduler v0.28 README and policy documentation: https://github.com/kubernetes-sigs/descheduler/blob/release-1.28/README.md
- Kubernetes Descheduler current README and metrics documentation: https://github.com/kubernetes-sigs/descheduler
- Kubernetes Descheduler v0.28 RBAC manifest: https://github.com/kubernetes-sigs/descheduler/blob/release-1.28/kubernetes/base/rbac.yaml
- Kubernetes Descheduler v0.28 CronJob manifest: https://github.com/kubernetes-sigs/descheduler/blob/release-1.28/kubernetes/cronjob/cronjob.yaml
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes node affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- LowNodeUtilization was described as using general node utilization. Updated the wording to clarify that the strategy uses pod requests compared with node allocatable resources, not live usage from `kubectl top`.
- Underutilized and overutilized node criteria were imprecise. Updated them to match Descheduler behavior: underutilized means below all configured thresholds; overutilized means above any configured target threshold.
- The `numberOfNodes` comment incorrectly implied parallel processing. Updated it to describe the minimum underutilized-node gate used by LowNodeUtilization.
- The advanced configuration used invalid or misplaced fields for LowNodeUtilization. Moved `nodeFit` and `priorityThreshold` under `DefaultEvictor`, removed the unsupported `namespaces.include` field, and kept `evictableNamespaces.exclude` for LowNodeUtilization.
- The test deployment comment said preferred node affinity would force placement. Updated it to say it prefers placement, which matches Kubernetes scheduling semantics.
- The monitoring example used `kubectl top nodes` as if it directly reflected LowNodeUtilization decisions. Added a note to compare pod requests with node allocatable resources for Descheduler decisions.
- The deployment example lacked a pod label required by the log and metrics selectors. Added `app: descheduler` to the CronJob pod template.
- The RBAC example used the wrong events API group and omitted namespace read permissions used by namespace filtering. Updated the event rule to `events.k8s.io` and added namespace permissions.
- The critical-node exclusion example used an unsupported `excludeNodeTaints` field. Replaced it with a valid policy-level `nodeSelector` example.
- The metrics Service used port `8080`, but Descheduler serves metrics on HTTPS port `10258` by default. Updated the Service and ServiceMonitor endpoint accordingly.

## Review Notes
The post still uses Descheduler image `v0.28.0`, which matches Kubernetes 1.28-era Descheduler documentation. Newer Descheduler releases exist, so future updates should either keep the version-specific framing or refresh examples against the latest release branch.
