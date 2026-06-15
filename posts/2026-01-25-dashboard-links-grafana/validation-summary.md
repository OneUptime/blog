# Validation Summary: How to Configure Dashboard Links in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard links
- Grafana panel links
- Grafana data links
- Grafana dashboard variables and URL variables
- Grafana Explore URLs
- Prometheus / PromQL
- Grafana Tempo / TraceQL
- Grafana Loki / LogQL

## Sources Consulted
- Grafana documentation: Manage dashboard links - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/manage-dashboard-links/
- Grafana documentation: Configure data links and actions - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/
- Grafana documentation: Dashboard URL variables - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard-url-variables/
- Grafana documentation: Add variables / global variables - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana documentation: Variable syntax - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana documentation: Get started with Explore / Explore URL schema - https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/
- Grafana Tempo documentation: TraceQL - https://grafana.com/docs/tempo/latest/traceql/
- Grafana Tempo documentation: Construct TraceQL queries - https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/

## Issues Found
- Dashboard-link tag examples did not match the surrounding explanation. Changed the sample tags from the blog metadata tags to `api, backend`, so the examples correctly produce the described tag-filtered dashboard list.
- Panel links were shown using data-link field/value variables such as `${__field.labels.service}` and `${__value.numeric}`. Grafana panel links support dashboard template variables and time variables, while field/value/data variables are documented for data links and actions. Updated the panel-link examples accordingly.
- Explore URL examples used the older `left` parameter shape. Updated them to the current `panes` and `schemaVersion=1` Explore URL structure and noted that the `panes` JSON should be URL-encoded.
- Data-link field access used unsupported dot notation such as `${__data.fields.traceID}` and `${__data.fields.pod}`. Changed these to documented bracket notation such as `${__data.fields["traceID"]}`.
- The PromQL histogram example omitted aggregation by `le`, which is required for a practical `histogram_quantile` over histogram buckets. Updated it to `sum by (le, service)`.
- The TraceQL example used `service.name` and a pipeline duration filter that did not match the documented TraceQL examples. Updated it to use `resource.service.name` and `span:duration`.
- The multi-value dashboard variable URL example used `${service:csv}` as a query parameter. Updated it to `${service:queryparam}`, which produces repeated `var-` parameters for multi-select variables.
- The incident link used a JavaScript-style ternary expression inside a Grafana URL variable, which Grafana variable interpolation does not support. Replaced it with a dashboard variable placeholder.
- The runbook link used a data-link field variable in a dashboard-link context. Replaced it with a dashboard variable placeholder.
- The conditional-link section implied value-based conditional display. Grafana field overrides apply links to matched fields, not arbitrary runtime conditions. Renamed and reworded that section to describe field-specific links accurately.

## Review Notes
The examples use `loki` and `tempo` as datasource UIDs for readability. In a real Grafana instance, readers should replace those values with the datasource UIDs from their own environment.
