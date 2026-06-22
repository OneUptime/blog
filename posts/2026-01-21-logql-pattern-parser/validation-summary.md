# Validation Summary: How to Parse Logs with Loki Pattern Parser

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Loki pattern parser
- Loki JSON parser
- LogQL label filters
- LogQL metric queries and unwrap

## Sources Consulted
- Grafana Loki documentation: Log queries and parser expressions: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki documentation: Pattern parser syntax, anchoring, and invalid pattern rules: https://grafana.com/docs/loki/latest/query/log_queries/#pattern
- Grafana Loki documentation: JSON parser syntax: https://grafana.com/docs/loki/latest/query/log_queries/#json
- Grafana Loki documentation: line_format and label_format pipeline expressions: https://grafana.com/docs/loki/latest/query/log_queries/#line-format-expression
- Grafana Loki documentation: Metric queries and unwrapped range aggregations: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki documentation: Pipeline errors and filtering `__error__`: https://grafana.com/docs/loki/latest/query/query_reference/#pipeline-errors

## Issues Found
- The nested JSON examples used `| json ... from <label>`, which is not documented LogQL syntax. Changed them to rewrite the line with `line_format` and then apply the JSON parser to the rewritten JSON payload.
- The optional-field fallback example mixed two separate queries into one invalid snippet and attempted to assign `referer=""` as a pipeline stage. Split it into two valid queries: one for logs with referer and one for logs without referer.
- The `avg_over_time` and `quantile_over_time` examples unwrapped labels without filtering conversion/parser errors. Added `| __error__ = ""` after `unwrap`, matching Loki guidance that metric queries must not contain pipeline errors.
- The P95 response time pattern required trailing content after `duration=<duration>ms`, so it would not match lines ending at the duration field. Removed the trailing anonymous capture.
- The troubleshooting example used `| limit 10`, which is not a documented LogQL pipeline stage. Changed it to a plain selector that can be limited through Grafana Explore or the query API.
- The mixed-format example combined a label predicate with `line_format` inside an `or` expression, which is invalid LogQL. Replaced it with a valid pattern parse followed by `__error__ = ""`.

## Review Notes
The post is technically relevant and broadly aligns with current Grafana Loki documentation. Future improvements could mention that extracted labels are query-time labels and that high-cardinality fields should generally not be promoted to indexed stream labels at ingestion time.
