# Validation Summary: How to Create Alert Documentation Links

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus alerting rules and PromQL
- Prometheus Alertmanager routing and notification templates
- Grafana alerting provisioning and alert annotations
- PagerDuty and Slack notification integrations
- Python link validation with PyYAML and Requests
- GitHub Actions CI workflows

## Sources Consulted
- Prometheus Alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Grafana alert rule panel linking documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/link-alert-rules-to-panels/
- Grafana alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana annotation and label documentation: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/annotation-label/
- GitHub Script action documentation: https://github.com/marketplace/actions/github-script

## Issues Found
- Prometheus histogram examples used `histogram_quantile()` directly over raw bucket rates. Added `sum by (le)` aggregation so the examples work correctly across multiple time series.
- Prometheus alert templates used unsupported `mul` template calls to format ratios as percentages. Changed the PromQL expressions to return percentages and formatted `$value` directly.
- Alertmanager routes used deprecated `match` blocks. Updated them to current `matchers` syntax.
- Alertmanager PagerDuty config used `service_key`. Updated it to `routing_key` for current PagerDuty Events API v2 configuration.
- The Slack webhook placeholders were written as environment variables in Alertmanager config, which Alertmanager does not expand by itself. Replaced them with syntactically valid example webhook URLs.
- The runbook Markdown example had malformed nested code fences. Changed the outer fence to four backticks and fixed the inner Bash fence closing marker.
- The Grafana provisioning example used `__dashboardUid__` and `__panelId__` annotations inside a file-provisioned rule. Updated it to use the `dashboardUid` and numeric `panelId` provisioning fields.
- The Prometheus templating example used unsupported `replace` and a questionable `$labels.alertname` reference. Updated it to use `reReplaceAll` against a metric label.
- The Alertmanager template example was labeled as YAML and included a PagerDuty JSON template that could produce invalid JSON. Changed the fence to `gotemplate` and replaced the JSON template with a plain description template.
- The Python link validation script had an unused `re` import and treated `HEAD` 405 responses as broken links. Removed the unused import and added a `GET` fallback for 405 responses.
- The GitHub Actions `github-script` example did not await the API call. Added `await` to the `github.rest.issues.createComment` call.

## Review Notes
Local `promtool` and `amtool` binaries were not installed, so native Prometheus and Alertmanager validation could not be run. YAML snippets were parsed with PyYAML and the Python code block was compiled successfully after fixes.
