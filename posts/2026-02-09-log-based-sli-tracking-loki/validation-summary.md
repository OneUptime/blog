# Validation Summary: How to Implement Log-Based SLI Tracking for Kubernetes Services with Loki

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Grafana Loki
- LogQL
- Loki recording and alerting rules
- Grafana dashboards
- Kubernetes ConfigMaps
- Service Level Indicators, Service Level Objectives, and error budgets

## Sources Consulted
- Grafana Loki metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki LogQL query reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki log queries documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki recording rules documentation: https://grafana.com/docs/loki/latest/operations/recording-rules/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana alert annotation and label template reference: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/reference/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Google SRE book, Service Level Objectives: https://sre.google/sre-book/service-level-objectives/

## Issues Found
- LogQL metric queries using `| json`, numeric comparisons, and `| unwrap` did not filter out pipeline errors. Loki metric queries fail when pipeline errors are present, so I added `| __error__=""` to the metric, dashboard, alerting, reporting, and user-journey queries after parser/conversion stages.
- The `sli:error_budget:ratio` recording rule referenced `sli:availability:ratio` directly. Loki recording rules write generated samples to a Prometheus-compatible remote-write backend, and Loki rule evaluation cannot rely on a previously recorded metric being available as a LogQL input. I changed the expression to calculate remaining error budget directly from 30-day log counts.
- The error-budget recording rule formula calculated consumed budget rather than remaining budget. I changed it to `1 - (error_ratio / allowed_error_ratio)`.
- The fast-burn alert claimed to detect 2% of budget consumed in one hour, but the expression checked for a raw 2% error rate. I changed it to calculate burn rate as `error_ratio / 0.001` and alert above `14.4x`, which corresponds to consuming 2% of a 30-day budget in one hour.
- The burn-rate example divided absolute error event rate by a budget fraction per hour, which ignored total request volume. I changed it to calculate current error ratio divided by the allowed 0.1% error budget.
- Alert annotation examples formatted ratios with `printf "...%%"` without multiplying by 100. I changed ratio annotations to use `humanizePercentage` and changed the burn-rate annotation to display an `x` multiple.
- The weekly error budget reporting query grouped by a `week` label that the query never creates. I changed the example to report 7-day error-budget consumption directly.

## Review Notes
The Kubernetes ConfigMap wrappers are syntactically valid as examples for storing rule/configuration text, but production Loki deployments still need the ruler configured to load those rule files and, for recording rules, remote-write configured to persist generated metrics.
