# Validation Summary: How to Create Alert Playbook Links

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus alerting rules and PromQL
- Alert annotations and runbook/playbook links
- Python
- PyYAML
- PostgreSQL `pg_stat_activity`
- Grafana dashboard JSON
- Mermaid diagrams
- Incident response playbooks and runbooks

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation for `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Python built-in `eval()` documentation: https://docs.python.org/3/library/functions.html#eval
- Python expressions documentation: https://docs.python.org/3/reference/expressions.html
- PyYAML documentation for `safe_load`: https://pyyaml.org/wiki/PyYAMLDocumentation
- PostgreSQL monitoring statistics documentation for `pg_stat_activity`: https://www.postgresql.org/docs/current/monitoring-stats.html
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/#dashboards
- Grafana threshold configuration documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-thresholds/

## Issues Found
- The API latency PromQL example used `histogram_quantile()` directly on raw classic histogram bucket rates. Changed it to aggregate with `sum by (le) (...)`, matching Prometheus guidance for classic histograms.
- The API error-rate PromQL example divided vectors with mismatched label sets because the numerator retained the `status` label while the denominator did not. Changed it to divide aggregated rates with `sum(...) / sum(...)`.
- The context-aware alert enrichment example assumed `alert['annotations']` already existed. Changed it to use `setdefault()` so enrichment works when the alert has labels but no annotations.
- The playbook action condition used uppercase `AND`, but the engine evaluates conditions as Python expressions. Changed it to lowercase `and`.
- The PostgreSQL idle-connection termination query used `query_start` to determine idle duration. Changed it to `state_change`, which is the `pg_stat_activity` timestamp for when the backend state last changed.
- The Python engine used lowercase `true` as its default expression, which is not a valid Python boolean literal. Changed it to `True`.
- The condition evaluator compared alert values as-is, which can fail when numeric alert labels or annotations arrive as strings. Added numeric conversion for string values where possible.
- The Grafana dashboard example was presented as YAML with a non-Grafana `dashboards` structure and an invalid threshold shape. Replaced it with a valid Grafana dashboard JSON model using `panels`, `fieldConfig.defaults.thresholds.mode`, and `fieldConfig.defaults.thresholds.steps`.

## Review Notes
The examples remain illustrative and include placeholders where integrations depend on the reader's alerting, approval, wiki, database, and metric-storage systems. Related OneUptime links returned HTTP 200 during review. Embedded Python snippets parse successfully, YAML snippets load with PyYAML, and the dashboard JSON parses as JSON; local `promtool`, `psql`, and Grafana binaries were not available for runtime validation.
