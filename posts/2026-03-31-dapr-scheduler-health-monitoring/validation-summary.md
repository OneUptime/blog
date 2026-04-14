# Validation Summary: How to Monitor Dapr Scheduler Service Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Scheduler service
- Kubernetes (StatefulSets, liveness/readiness probes)
- Prometheus (ServiceMonitor, alerting rules)
- etcd (embedded in Dapr Scheduler)
- Helm (Dapr Helm chart configuration)

## Sources Consulted
- Dapr Scheduler StatefulSet Helm template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/templates/dapr_scheduler_statefulset.yaml
- Dapr Scheduler Service Helm template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/templates/dapr_scheduler_service.yaml
- Dapr Scheduler subchart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/values.yaml
- Dapr Helm Chart.yaml (dependency names): https://github.com/dapr/dapr/blob/master/charts/dapr/Chart.yaml
- Dapr metrics documentation: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Scheduler overview: https://docs.dapr.io/concepts/dapr-services/scheduler/
- etcd v3.5 metrics (is_leader gauge): https://github.com/etcd-io/etcd/blob/v3.5.21/server/etcdserver/metrics.go

## Issues Found

1. **Incorrect StatefulSet and pod name throughout the post**: The post used `dapr-scheduler` as the StatefulSet name and `dapr-scheduler-0` as the pod name. The actual names are `dapr-scheduler-server` and `dapr-scheduler-server-0` respectively, as defined in the Helm chart template. Fixed in all occurrences: `kubectl exec`, `kubectl get statefulset`, `kubectl logs` (direct pod reference).

2. **Wrong Prometheus metric name for failed jobs**: The post used `dapr_scheduler_jobs_failed_total` but the actual metric name is `dapr_scheduler_trigger_jobs_failed_total` (note the `trigger_` segment). Fixed in the metrics list and in the alerting rule PromQL expression.

3. **Incorrect ServiceMonitor label selector**: The post used `app: dapr-scheduler` but the actual label on the Scheduler service is `app: dapr-scheduler-server`. A ServiceMonitor with the wrong label would match zero services and collect no metrics. Fixed.

4. **Incorrect kubectl logs label selector**: The post used `-l app=dapr-scheduler` but the correct pod label is `app: dapr-scheduler-server`. Using the wrong label would return no logs. Fixed in both log commands.

5. **Unsupported Helm value `timeoutSeconds`**: The post included `timeoutSeconds: 5` under `livenessProbe` in the Helm values, but this field is not defined in the Dapr Scheduler subchart's values.yaml and would not be templated into the StatefulSet. Removed to avoid confusion.

## Review Notes
- The Helm values shown in the post are presented as customization examples, not as defaults. The actual chart defaults differ (e.g., `periodSeconds: 3` instead of `10`, `readinessProbe.initialDelaySeconds: 3` instead of `5`). This is acceptable since the post frames them as customizable overrides.
- The Dapr Scheduler exposes additional useful metrics not mentioned in the post: `dapr_scheduler_sidecars_connected`, `dapr_scheduler_trigger_jobs_undelivered_total`, and `dapr_scheduler_trigger_latency`. These could be valuable additions in a future update.
- The health endpoint port (8080) and path (`/healthz`) were verified as correct against the StatefulSet template.
- The `etcd_server_is_leader` metric is valid since the Dapr Scheduler embeds etcd v3.5.
- The Prometheus ServiceMonitor API version (`monitoring.coreos.com/v1`) and structure are correct.
- The alerting rule syntax and PromQL expressions are valid Prometheus alerting rule format.
