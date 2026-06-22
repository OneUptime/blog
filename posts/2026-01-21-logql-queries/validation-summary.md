# Validation Summary: How to Write LogQL Queries for Loki

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana log queries
- Stream selectors
- Line filters
- Parser expressions
- Label filters
- LogQL formatting and aggregation

## Sources Consulted
- Grafana Loki documentation: LogQL query overview: https://grafana.com/docs/loki/latest/query/
- Grafana Loki documentation: Log queries: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki documentation: Metric queries: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki documentation: Query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Loki documentation: LogQL template functions: https://grafana.com/docs/loki/latest/query/template_functions/

## Issues Found
- Corrected LogQL template function names from `ToLower`, `ToUpper`, `Title`, and `Trim` to the documented lowercase functions `lower`, `upper`, `title`, and `trim`.
- Corrected the `label_format` rename example from template-copy syntax to rename syntax: `label_format service=app`.
- Corrected the nested-field label formatting example from `{{.error.type}}` to `{{.error_type}}`, matching Loki's extracted label naming rules.
- Corrected the drop-label example to use the documented `drop` expression instead of `label_format pod=""`.
- Removed an invalid standalone `unwrap` use from the log-query type conversion example. `unwrap` is for unwrapped range metric queries; simple numeric label filtering can use `response_time > 100`.

## Review Notes
The remaining examples align with current Grafana Loki LogQL documentation. Some examples assume parsed labels such as `level`, `duration`, `status_code`, and `response_time` exist in the log payload or stream labels.
