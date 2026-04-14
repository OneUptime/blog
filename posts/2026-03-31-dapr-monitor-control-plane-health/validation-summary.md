# Validation Summary: How to Monitor Dapr Control Plane Health Continuously

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (control plane components: operator, sidecar injector, placement server, sentry)
- Kubernetes (Deployments, StatefulSets, CronJobs, health probes)
- Prometheus (ServiceMonitor, PrometheusRule, PromQL)
- Bash scripting

## Sources Consulted
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Kubernetes overview: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr CLI reference (`dapr status`): https://docs.dapr.io/reference/cli/dapr-status/
- Dapr source code — `pkg/metrics/options.go` (default metrics port 9090)
- Dapr source code — `pkg/metrics/exporter.go` (default metrics path `/`)
- Dapr Helm chart — `charts/dapr/values.yaml` (global.prometheus.port, k8sLabels)
- Dapr Helm chart — `charts/dapr/charts/dapr_placement/templates/dapr_placement_statefulset.yaml` (confirms StatefulSet)

## Issues Found
1. **Incorrect metrics port (8080 → 9090):** The port-forward command used port 8080, but Dapr control plane components expose Prometheus metrics on port 9090 by default (confirmed by `pkg/metrics/options.go` and `charts/dapr/values.yaml`). Port 8080 is used for the health check endpoint, not metrics. Fixed the port-forward command and curl URL to use port 9090.

2. **Incorrect metrics path (`/metrics` → `/`):** Both the curl command and the ServiceMonitor specified `/metrics` as the metrics path. Dapr serves Prometheus metrics at the root path `/`, not `/metrics` (confirmed by `pkg/metrics/exporter.go` where `defaultMetricsPath = "/"`). Fixed both the curl command and the ServiceMonitor `path` field.

3. **Placement server treated as Deployment instead of StatefulSet:** The health check bash script used `kubectl get deployment` for all four components including `dapr-placement-server`. However, the placement server is deployed as a StatefulSet, not a Deployment (confirmed by the Helm chart template). The script would fail silently for the placement server, always reporting empty values. Fixed by separating Deployments and StatefulSets into distinct arrays and querying with the correct resource type.

## Review Notes
- Dapr 1.12+ introduces a fifth control plane component, `dapr-scheduler` (also a StatefulSet). The blog post does not mention it, which is acceptable if targeting Dapr versions prior to 1.12, but readers on newer versions should be aware they may want to monitor it as well.
- The PromQL expressions using `absent(up{job="..."} == 1)` are correct and idiomatic for detecting service downtime.
- The `dapr status -k` command and the `app.kubernetes.io/part-of: dapr` label selector in the ServiceMonitor are both correct.
