# Validation Summary: How to Set Up Alerts for OutOfSync ArgoCD Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana
- jq

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD application controller metrics source: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/metrics.go
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The investigation command `argocd app list --sync-status OutOfSync` used an unsupported Argo CD CLI flag. Current official command documentation for `argocd app list` does not include `--sync-status`. Changed it to `argocd app list -o json | jq -r '.[] | select(.status.sync.status == "OutOfSync") | .metadata.name'`, which uses the documented JSON output mode and filters the application sync status from the returned Application data.

## Review Notes
- The `argocd_app_info` metric, gauge type, and labels used in the PromQL examples are consistent with Argo CD documentation and controller source. The source defines labels including `autosync_enabled`, `dest_namespace`, `sync_status`, `health_status`, and `operation`.
- The PrometheusRule resource shape uses the current `monitoring.coreos.com/v1` API and valid alerting/recording rule fields.
- The `ignoreDifferences` example aligns with Argo CD's documented application-level diff customization fields for JSON pointers and JQ path expressions.
- The environment and percentage thresholds are operational policy choices rather than universal Argo CD defaults; readers may need to tune them for their deployment cadence.
