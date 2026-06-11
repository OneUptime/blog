# Validation Summary: How to Create Log Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Structured logging
- Node.js console logging
- Pino
- Grafana
- Grafana Loki
- LogQL
- Grafana dashboard JSON
- Grafana data source provisioning
- Loki alerting rules
- logcli
- Mermaid diagrams

## Sources Consulted
- Grafana Loki log queries documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki query troubleshooting documentation: https://grafana.com/docs/loki/latest/query/troubleshoot-query/
- Grafana Loki logcli getting started documentation: https://grafana.com/docs/loki/latest/query/logcli/getting-started/
- Grafana Loki template variables documentation: https://grafana.com/docs/grafana/latest/datasources/loki/template-variables/
- Grafana Loki data source configuration documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Pino API documentation: https://github.com/pinojs/pino/blob/main/docs/api.md

## Issues Found
- The Pino structured logging example used default numeric log levels while the LogQL examples filtered for `level="error"`. Updated the Pino configuration to emit string level labels with `formatters.level`, so the later LogQL examples match the logged JSON.
- Several LogQL snippets filtered on `level="error"` before parsing JSON. Updated those snippets to use `| json | level="error"` so the extracted `level` field is available to the label filter.
- The log volume query grouped by `level` without parsing JSON first. Updated it to parse JSON before the range selector so the extracted `level` label can be aggregated.
- The alert rule mixed a ratio threshold (`> 0.05`) with percentage wording. Updated the expression to multiply by 100 and compare against `> 5`.
- The Loki alert rule included `apiVersion: 1`, which is not part of Loki's Prometheus-compatible ruler rule file format. Removed the field.
- The performance section used `| limit 500`, which is not a LogQL pipeline stage. Replaced it with a `logcli query --limit=500` example, matching Loki's documented logcli limit option.

## Review Notes
The Grafana dashboard JSON example is illustrative rather than a full exported dashboard model with every optional field Grafana may add. The data source provisioning example, LogQL range aggregations, JSON parsing, label filtering, line formatting, template variable query, and logcli limit usage were verified against current official documentation.
