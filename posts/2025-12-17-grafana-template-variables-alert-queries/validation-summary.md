# Validation Summary: How to Fix 'Template variables not supported in alert queries'

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Grafana Alerting
- Grafana dashboard template variables
- Grafana alert rule annotations and notification templates
- Prometheus
- PromQL
- Prometheus recording and alerting rules
- promtool

## Sources Consulted
- Grafana Prometheus alerting documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/alerting/
- Grafana alert rule labels and annotations documentation: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/annotation-label/
- Grafana annotation and label template reference: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/reference/
- Grafana notification template reference: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/template-notifications/reference/
- Grafana alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana variable syntax documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- The Grafana alert rule annotation example used `{{ $values.A }}` as if it were the numeric value. Grafana's alert-rule template reference documents `$values.A` as an object with a `Value` property, so I changed it to `{{ $values.A.Value }}`.
- The notification-template section listed `$labels`, `$values`, and `$value` as notification-template variables. Those variables apply to alert rule annotations and labels, while notification templates use the notification data object such as `.CommonLabels`, `.Alerts.Firing`, `.Labels`, and `.Values`. I renamed the subsection and added the distinction.
- The "Use Variables with Default Values" strategy implied dashboard variable defaults make variables work in alert queries. Grafana's Prometheus alerting documentation states alert queries do not support template variables, so I changed the section to say the alert query should use the equivalent resolved literal scope directly.

## Review Notes
- The post is technically relevant and aligns with current Grafana guidance: alert queries do not support dashboard template variables because they are evaluated without dashboard context.
- The PromQL examples, Prometheus recording rule syntax, Prometheus alerting rule examples, and `promtool query instant` / `promtool check rules` command forms match official Prometheus documentation.
- `promtool` is not installed in this environment, so command examples were checked against official documentation rather than executed locally.
