# Validation Summary: How to Monitor ArgoCD Health as Part of Cluster Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Grafana
- Argo CD Notifications
- Lua custom health checks
- jq

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_list/
- Argo CD `argocd cluster get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/
- Argo CD metrics source for cluster metric labels and values: https://raw.githubusercontent.com/argoproj/argo-cd/v3.3.0/controller/metrics/clustercollector.go
- Argo CD metrics source for sync and Kubernetes request metric labels: https://raw.githubusercontent.com/argoproj/argo-cd/v3.3.0/controller/metrics/metrics.go

## Issues Found
- The CLI examples used unsupported `argocd app list --health-status` and `--sync-status` flags. Replaced them with `argocd app list -o json` piped through `jq` filters, since the official `app list` command exposes output, cluster, project, repository, and selector filters but not health or sync status flags.
- The cluster connectivity examples used `argocd_cluster_info` as a status gauge. Replaced connectivity checks with `argocd_cluster_connection_status`, which is the documented metric for current Kubernetes cluster connection status.
- The cluster unreachable alert compared `argocd_cluster_info` to `0`, but `argocd_cluster_info` is emitted as an informational gauge with value `1`. Updated the alert to use `argocd_cluster_connection_status == 0`.
- The cluster unreachable alert referenced `$labels.name`, but `argocd_cluster_connection_status` exposes `server` and `k8s_version` labels, not `name`. Updated the annotations to use `$labels.server`.
- The post referenced nonexistent `argocd_cluster_api_resource_actions_total{action="error"}`. Replaced it with a 5xx error-rate query based on the documented `argocd_app_k8s_request_total` metric.
- The sync duration example incorrectly applied `histogram_quantile` to `argocd_app_sync_total`, which is a counter, not a histogram bucket. Replaced it with an average duration calculation using `argocd_app_sync_duration_seconds_total` divided by sync count.
- The high API error-rate alert divided vectors while retaining `response_code`, which would not calculate a server-level error ratio correctly. Updated it to aggregate numerator and denominator by `server`.
- The reconciliation p95 examples were updated to aggregate histogram buckets by `le` and `dest_server` before calling `histogram_quantile`.
- The custom Lua health checks iterated over `obj.status.conditions` without verifying that `conditions` existed. Added `obj.status.conditions ~= nil` guards.
- The Grafana cluster connectivity panel counted `argocd_cluster_info`, which included unreachable cluster info rather than connected clusters. Updated it to sum `argocd_cluster_connection_status`.

## Review Notes
- The ServiceMonitor selectors match the examples in the official Argo CD metrics documentation. The exact required `metadata.labels.release` value remains Prometheus installation-specific.
- The Argo CD Notifications snippet is structurally plausible, but a complete working setup also requires notification services and subscriptions or default recipients, which are outside the scope of the snippet shown.
