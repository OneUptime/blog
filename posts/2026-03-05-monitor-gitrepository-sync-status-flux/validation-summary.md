# Validation Summary: How to Monitor GitRepository Sync Status in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux GitRepository sources
- Kubernetes CLI and events
- Flux notification-controller
- Prometheus and Prometheus Operator
- kube-state-metrics
- Grafana dashboards
- Kubernetes CronJobs and RBAC

## Sources Consulted
- Flux CLI reference for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux troubleshooting cheatsheet: https://fluxcd.io/flux/cheatsheets/troubleshooting/
- Flux events documentation: https://fluxcd.io/flux/monitoring/events/
- Flux alerts documentation: https://fluxcd.io/flux/monitoring/alerts/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux Source API reference for GitRepository and Artifact status fields: https://fluxcd.io/flux/components/source/api/v1/
- Flux package documentation for Artifact `lastUpdateTime`: https://pkg.go.dev/github.com/fluxcd/pkg/apis/meta

## Issues Found
- The Flux CLI examples used `flux get source git`, but the documented command is `flux get sources git`. Updated all three CLI examples.
- The Flux notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation exposes `Provider` and `Alert` under `notification.toolkit.fluxcd.io/v1beta3`. Updated both manifests.
- The kubectl example described a Ready condition `lastTransitionTime` as the last reconciliation time. This timestamp only changes when the condition transitions. Updated the example to show `.status.artifact.lastUpdateTime` and changed the wording to "last artifact update time."
- The metrics section used `gotk_reconcile_condition` and `gotk_suspend_status` as the main readiness and suspension metrics. Current Flux docs recommend `gotk_resource_info` from kube-state-metrics for Flux custom resource state. Updated the metric examples, alert rules, and Grafana queries.
- The reconciliation duration metric was shown as `gotk_reconcile_duration_seconds`, but Flux exposes reconciliation duration as a histogram with `_bucket`, `_sum`, and `_count` series. Updated metric examples and PromQL to use `gotk_reconcile_duration_seconds_bucket` with `histogram_quantile`.
- The stale artifact alert used reconciliation duration as if it were a timestamp. Replaced it with a slow reconciliation alert based on the 95th percentile histogram duration.
- The CronJob used `serviceAccountName: flux-health-checker` without creating RBAC resources. Added a ServiceAccount, ClusterRole, and ClusterRoleBinding granting list/get access to GitRepository resources.
- The CronJob JSONPath assumed the Ready condition was the first condition in the array. Updated it to filter for the Ready condition by type before evaluating status.

## Review Notes
The Prometheus examples now assume kube-state-metrics is configured to export Flux custom resource state as `gotk_resource_info`, as described in the Flux custom metrics documentation. The Grafana dashboard JSON is still a minimal illustrative dashboard payload and may need additional dashboard metadata depending on the Grafana provisioning setup.
