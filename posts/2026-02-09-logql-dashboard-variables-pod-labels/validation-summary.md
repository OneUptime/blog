# Validation Summary: Build LogQL Dashboard Variables That Dynamically Filter by Kubernetes Pod Labels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard variables
- Grafana Loki data source
- LogQL
- Kubernetes labels

## Sources Consulted
- Grafana Loki template variables documentation: https://grafana.com/docs/grafana/latest/datasources/loki/template-variables/
- Grafana Loki query editor documentation: https://grafana.com/docs/grafana/latest/datasources/loki/query-editor/
- Grafana Loki LogQL query documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki log queries documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana variable syntax documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana chained variables documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana Loki labels documentation: https://grafana.com/docs/loki/latest/get-started/labels/

## Issues Found
- Several `label_values()` examples attempted to use LogQL pipelines or metric expressions, such as `| json` and `rate(...)`, inside variable queries. Grafana's Loki variable documentation supports label names and label values, optionally scoped by a log stream selector, so these examples were changed to use Loki labels only.
- Sections that described extracting variable values directly from parsed JSON log content were corrected to state that fields such as `request_path`, `error_type`, and `downstream_service` must be promoted to Loki labels before they can be used with `label_values()`.
- The `log_level` custom variable included both a literal `all` value and Grafana's Include All option. The literal `all` option was removed and a custom all value of `.*` was added.
- Multi-value variables were used in equality matchers or raw regex interpolation. Affected examples were updated to use regex matchers and `${var:regex}` interpolation where appropriate.
- The pod-name regex example used `$deployment` in the middle of a string. It was changed to `${deployment}-.*`, which follows Grafana's documented variable syntax for variables embedded in expressions.
- The `| limit $log_limit` example was invalid LogQL. It was replaced with a metric-query interval example, and the surrounding text now points readers to Grafana's Loki query editor line limit option.
- The template variable snippet was marked as JSON even though it was not valid JSON. The code fence was changed to `text`.
- The debugging instructions said to test `label_values()` in Explore. They were corrected to use Grafana's variable editor preview.
- The best-practice recommendation to set a TTL for variable queries was changed to recommend intentional refresh behavior and query caching where available.

## Review Notes
- The corrected examples assume the referenced Kubernetes metadata has been stored as Loki labels. Loki label names must use the Prometheus-compatible label-name format, so Kubernetes label names such as `app.kubernetes.io/name` are represented as `app_kubernetes_io_name`.
- Loki documentation cautions against high-cardinality labels. Pod labels can be useful for filtering, but teams should avoid promoting unbounded request paths, user IDs, or similar fields unless they have a clear indexing strategy.
