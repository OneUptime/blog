# Validation Summary: How to Configure Flux CD with New Relic for Monitoring

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Flux CD
- Kubernetes
- New Relic Prometheus agent
- Prometheus metrics
- NRQL
- Flux notification-controller Alert and Provider resources
- New Relic deployment markers / change tracking

## Sources Consulted
- New Relic Prometheus agent setup documentation: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/setup-prometheus-agent/
- New Relic Prometheus agent Helm chart values: https://raw.githubusercontent.com/newrelic/newrelic-prometheus-configurator/main/charts/newrelic-prometheus-agent/values.yaml
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert API documentation: https://fluxcd.io/flux/components/notification/alerts/
- New Relic NRQL reference for Prometheus histogram bucket percentiles: https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/
- New Relic deployment marker documentation: https://docs.newrelic.com/docs/apm/new-relic-apm/maintenance/record-monitor-deployments/

## Issues Found
- The New Relic Prometheus agent values used `config.static_targets` as a list and placed `extra_metric_relabel_config` at the wrong level. Current chart values require `config.static_targets.jobs`, with per-job `targets`, `labels`, and `extra_metric_relabel_config`. Updated the YAML accordingly.
- The Helm command installed `newrelic/nri-prometheus`, while the current Prometheus agent chart is `newrelic/newrelic-prometheus-agent`. Updated the chart name.
- The post treated `gotk_reconcile_condition` and `gotk_suspend_status` as controller-scraped Flux metrics. Current Flux documentation lists controller metrics such as `gotk_reconcile_duration_seconds_*` and `controller_runtime_reconcile_total`; Flux resource state is collected through kube-state-metrics as `gotk_resource_info`. Updated the metric descriptions and NRQL queries.
- The reconciliation duration queries used `gotk_reconcile_duration_seconds` as a direct metric. Flux exposes this as Prometheus histogram series, so the average query now uses `_sum` and `_count`, and the slow-reconciliation query now uses New Relic's `bucketPercentile()` function on `_bucket`.
- The controller error-rate query used `controller_runtime_reconcile_errors_total`, but current Flux docs list `controller_runtime_reconcile_total{controller,result}`. Updated the query to filter `result = 'error'`.
- The deployment marker example sent Flux generic-hmac events directly to the New Relic REST deployment endpoint. Flux sends a Flux Event JSON body with an HMAC signature, while New Relic's deployment marker API expects a New Relic deployment payload and API key header. Updated the example to send Flux events to an intermediate webhook that verifies and transforms the event before calling New Relic.

## Review Notes
The corrected resource health and suspended-resource NRQL examples require kube-state-metrics custom resource metrics for Flux. The static New Relic Prometheus agent configuration shown in the post scrapes the Flux controller metrics; users must also ingest the kube-state-metrics endpoint if they want the `gotk_resource_info` dashboard widgets and alerts to return data.
