# Validation Summary: How to Handle Service Level Objectives (SLOs)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Site Reliability Engineering
- Service Level Objectives
- Service Level Indicators
- Service Level Agreements
- Error budgets
- Prometheus
- PromQL
- Alertmanager
- Grafana dashboards
- Python
- prometheus-api-client
- Mermaid diagrams
- YAML
- JSON

## Sources Consulted
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Google SRE Workbook, "Prometheus Alerting: Turn SLOs into Alerts": https://sre.google/workbook/alerting-on-slos/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana threshold configuration documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-thresholds/
- prometheus-api-client documentation: https://prometheus-api-client-python.readthedocs.io/en/latest/source/prometheus_api_client.html
- Python string formatting documentation: https://docs.python.org/3/library/string.html

## Issues Found
- The data freshness SLI used `time() - data_last_update_timestamp < 300` inside `sum(...)`. In PromQL, comparison operators filter by default and return the left-hand sample value for matching series, so this summed ages rather than counting fresh series. Changed it to use `< bool 300` so the numerator is a count of fresh series.
- The Prometheus rule example referenced `sli:api_availability:ratio_rate30m`, `ratio_rate1h`, `ratio_rate6h`, `ratio_rate3d`, and `ratio_rate30d` without defining them. Added matching recording rules so the error budget, dashboard, and alert examples have the required inputs.
- The critical burn-rate alert used a `3x` burn rate for the six-hour page window. Google's SRE Workbook recommends `6x` over six hours paired with a 30-minute short window for the page-level alert. Updated the threshold and comment.
- The Prometheus alert name did not match the Alertmanager route names. Renamed the critical alert to `SLOBurnRateCritical` and added a corresponding `SLOBurnRateWarning` ticket-level alert.
- The Alertmanager example used the older `match` route syntax. Updated it to `matchers`, which is the current documented route matcher format.
- The Alertmanager Slack and PagerDuty templates referenced an `error_budget` annotation that the Prometheus rules did not define. Removed the undefined annotation reference from the notification templates.

## Review Notes
The examples are intentionally generic and assume compatible metric names and labels such as `http_requests_total`, `status`, and `job`. In a production setup, teams should confirm their instrumentation uses the same labels and should adapt success/error definitions to their API semantics.
