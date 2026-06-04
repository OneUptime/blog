# Validation Summary: How to Implement Prometheus Alert Silences During Maintenance Windows

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Prometheus
- Alertmanager
- Alertmanager v2 API
- amtool
- Kubernetes CronJob
- PrometheusRule
- Bash, curl, jq

## Sources Consulted
- Prometheus Alertmanager overview and silences documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager API overview: https://prometheus.io/docs/alerting/latest/alerts_api/
- Alertmanager v2 OpenAPI specification: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- Alertmanager upstream README with amtool examples: https://github.com/prometheus/alertmanager
- Alertmanager silence metrics source: https://github.com/prometheus/alertmanager/blob/main/silence/silence.go

## Issues Found
- The introduction claimed silences preserve alert history. Alertmanager silences suppress notifications while alerts continue to be evaluated and remain visible, but Alertmanager is not an alert-history store. Changed "alert history" to "alert visibility."
- The PromQL examples referenced `alertmanager_silences_created_total`, which is not an Alertmanager silence metric. Replaced it with `rate(alertmanager_silences_queries_total[1h])`, a current upstream metric for silence API query activity.
- The `LongRunningSilence` rule referenced nonexistent per-silence start-time metric `alertmanager_silence_start_time_seconds`. Replaced the rule with `SilenceMaintenanceErrors` using the current `alertmanager_silences_maintenance_errors_total` metric.

## Review Notes
- Alertmanager v2 silence API examples use the current `/api/v2/silences` and `/api/v2/silence/{silenceID}` endpoints. `isEqual` is optional in the current OpenAPI schema and defaults to true, while `isRegex` is required.
- The `amtool silence add`, `query`, and `expire` commands match upstream examples and current CLI conventions.
- The date commands use GNU `date -d` syntax. This is common in Linux CI environments, but may need adjustment on macOS or minimal container images that do not include GNU coreutils.
