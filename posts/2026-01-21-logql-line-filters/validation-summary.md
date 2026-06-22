# Validation Summary: How to Use LogQL Line Filters Effectively

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Grafana Loki
- LogQL
- Loki line filters and label filters
- Loki JSON, logfmt, pattern, and regexp parsers
- Loki metric queries

## Sources Consulted
- Grafana Loki documentation: Query Loki - https://grafana.com/docs/loki/latest/query/
- Grafana Loki documentation: Log queries - https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki documentation: Query examples - https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Loki documentation: Query best practices - https://grafana.com/docs/loki/latest/query/bp-query/
- Grafana Loki documentation: Metric queries - https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki documentation: Loki HTTP API - https://grafana.com/docs/loki/latest/reference/loki-http-api/

## Issues Found
- The post stated that line filters are applied before any parsing stages as an absolute rule. Loki permits line filters elsewhere in a pipeline, though placing them before parsers is the documented performance recommendation. Changed the wording to describe this as best-practice placement rather than a language rule.
- The JSON field contains example used `message |= "timeout"` after `| json`. In LogQL, `|=` is a line filter operator, while parsed JSON fields are extracted labels and should be filtered with label filter operators such as `=~`. Changed it to `message =~ ".*timeout.*"`.
- The nested JSON example used `| json error_details from error`, which is not valid LogQL JSON parser syntax. Changed it to `| json error_details="error.details"` and used a valid label regex filter on the extracted field.
- The examples used `| limit 100` and `| limit 10`, but `limit` is not a LogQL pipeline stage. Changed those examples to plain LogQL queries and noted that limits should be set through Grafana Explore, `logcli --limit`, or the Loki API `limit` parameter.

## Review Notes
The rest of the line filter operators, regex guidance, parser usage, metric query examples, and performance recommendations align with current Grafana Loki documentation. The post does not pin a Loki version; the review was performed against the latest official Loki documentation available on 2026-06-21.
