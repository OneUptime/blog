# Validation Summary: How to Build SLO Dashboards in Grafana

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana dashboards and panels
- Grafana Prometheus data source variables
- Prometheus and PromQL
- Prometheus recording rules and alerting rules
- SLOs, SLIs, error budgets, and burn-rate alerting

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus histograms and summaries best practices: https://prometheus.io/docs/practices/histograms/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana stat visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/stat/
- Grafana gauge visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/gauge/
- Grafana thresholds documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-thresholds/
- Grafana histograms and heatmaps documentation: https://grafana.com/docs/grafana/latest/fundamentals/intro-histograms/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- Google SRE Workbook, Implementing SLOs: https://sre.google/workbook/implementing-slos/

## Issues Found
- The time-until-budget-exhaustion query divided remaining budget ratio by hourly error ratio, which did not produce hours for a 30-day request-based SLO. Changed it to divide remaining budget requests over the 30-day window by the current hourly error count.
- The cumulative error-budget-consumption query relied on PromQL operator precedence in a way that evaluated as `1 - (success_ratio / error_budget)` instead of `(1 - success_ratio) / error_budget`. Added parentheses and a separate percentage version.
- The latency distribution panel described a heatmap but called it a histogram panel and used older Grafana wording for pre-bucketed data. Updated the wording and changed the panel configuration to use Prometheus query format `Heatmap`.
- The Grafana variable example used the deprecated classic `label_values(metric, label)` query syntax. Updated it to the current Label values query type with metric and label fields.
- The alerting example referenced `slo:burn_rate:ratio_rate6h` without defining the matching recording rule. Added 5m, 30m, and 6h SLI and burn-rate recording rules so the multi-window alert examples have the metrics they use.
- The multi-window burn-rate alert section used single-window expressions even though it was labeled multi-window. Updated the critical alert to require both 1h and 5m burn rates, and the warning alert to require both 6h and 30m burn rates.
- The critical alert description said the budget would exhaust in less than one hour at burn rate 14.4, which is not accurate for a 30-day SLO. Reworded the description to state that the service is consuming error budget faster than the allowed rate.
- The best-practice window list only mentioned 1h and 6h after the alert examples were corrected. Updated it to include 5m, 30m, 1h, and 6h.

## Review Notes
The PromQL examples assume conventional Prometheus counter metrics named `http_requests_total` and classic histogram metrics named `http_request_duration_seconds_bucket` / `_count`. Those metric names are application-specific examples, not built-in Prometheus metrics.
