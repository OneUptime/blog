# Validation Summary: How to use Grafana Explore for ad-hoc querying across data sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Explore
- Prometheus and PromQL
- Grafana Loki and LogQL
- Grafana Tempo and TraceQL
- Grafana Alerting
- Grafana exemplars and Explore sharing

## Sources Consulted
- Grafana Explore documentation: https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/
- Grafana Explore query management documentation: https://grafana.com/docs/grafana/latest/visualizations/explore/query-management/
- Grafana Prometheus query editor documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana Prometheus data source exemplars documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/
- Grafana Loki query editor documentation: https://grafana.com/docs/grafana/latest/datasources/loki/query-editor/
- Grafana Loki LogQL query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Tempo query editor documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/query-editor/
- Grafana Tempo TraceQL query examples: https://grafana.com/docs/grafana/latest/datasources/tempo/query-editor/traceql-query-examples/
- Grafana Tempo TraceQL syntax documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Alerting rule creation documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/

## Issues Found
- Explore query execution was described as showing results immediately while typing. Updated it to say queries must be run, while autocomplete helps as you type.
- Split view was described as always synchronizing time ranges and cursor positions. Updated it to match Grafana's documented time-picker linking behavior.
- TraceQL service filters used unscoped `service.name`. Updated examples to use `resource.service.name`, matching current Grafana Tempo examples and OpenTelemetry service attributes.
- Query history access mentioned `Ctrl+H`. Updated this to the documented Query history pane.
- Alert creation was described as a direct "Create alert rule from this query" conversion from Explore with a preserved time range. Updated it to the documented workflow of validating the query in Explore, then creating an alert rule in Alerts & IRM with a fixed relative evaluation range.
- Mixed data source wording said multiple data sources were part of the same query. Updated it to say they are part of the same Explore pane.
- Exemplar wording implied automatic Tempo linking whenever metrics include exemplars. Updated it to note that an exemplar trace link must be configured.
- Keyboard shortcuts included incorrect entries for running, clearing, and adding query lines. Updated the list to documented/current shortcuts and the built-in shortcut help.
- The Explore share URL example used the older `left` and `range` query parameters. Updated it to the current `panes` and `schemaVersion=1` URL structure.

## Review Notes
The remaining PromQL, LogQL, and TraceQL examples are illustrative and syntactically aligned with current documentation, assuming the referenced labels and metrics exist in the reader's environment.
