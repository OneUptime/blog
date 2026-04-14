# Validation Summary: How to Monitor Dapr Upgrade Progress

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (version 1.14.0)
- Kubernetes (kubectl)
- Helm
- Prometheus (PromQL queries and alerting rules)
- Python 3 (inline scripts for JSON parsing)
- kube-state-metrics

## Sources Consulted
- Dapr Helm chart source code — `charts/dapr/charts/dapr_scheduler/templates/dapr_scheduler_statefulset.yaml` (confirms StatefulSet name `dapr-scheduler-server`)
- Dapr metrics documentation — https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr HTTP monitoring source code — https://github.com/dapr/dapr/blob/master/pkg/diagnostics/http_monitoring.go (confirms `status` label, not `status_code`)
- Dapr internal metrics reference — https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Kubernetes upgrade guide — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/
- Dapr Kubernetes production guidelines — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/

## Issues Found
1. **Incorrect scheduler StatefulSet name** (line 35): The post referenced `statefulset/dapr-scheduler` but the correct name in the Dapr Helm chart is `statefulset/dapr-scheduler-server`, following the same naming convention as `dapr-placement-server`. Fixed to `dapr-scheduler-server`.

2. **Incorrect Prometheus metric label** (line 94): The PromQL query used `status_code=~"5.."` but the Dapr HTTP metrics use `status` as the label name for HTTP status codes, not `status_code`. This is confirmed in the Dapr source code (`http_monitoring.go`) where the tag key is defined as `tag.MustNewKey("status")`. Fixed to `status=~"5.."`.

## Review Notes
- The `--reuse-values` flag in the Helm upgrade command (line 28) is technically valid but not recommended by Dapr's official upgrade documentation. The official docs use `helm upgrade dapr dapr/dapr --version <version> --namespace dapr-system --wait` without `--reuse-values`. Using `--reuse-values` can prevent new default values from being applied when upgrading to a chart version that introduces new configuration options. For production upgrades, maintaining a version-controlled values file with `--values` is the recommended approach.
- The Prometheus metrics section uses a `bash` code block for PromQL queries. These are not bash commands but monitoring queries meant to be used in Grafana or Prometheus UI. This is a common convention in blog posts and is clear from context.
- `kubectl version` in the "Verifying Upgrade Completion" section shows the Kubernetes version, not the Dapr version. The `dapr version` command on the next line is the one that verifies the Dapr upgrade. Including `kubectl version` is not wrong (it provides useful context) but could be clarified.
