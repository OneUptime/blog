# Validation Summary: How to Use LogQL Metric Queries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- LogQL metric queries
- Log range aggregations
- Unwrapped range aggregations
- Vector aggregations
- Grafana dashboard variables

## Sources Consulted
- Grafana Loki metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki query documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki LogQL query reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki query examples: https://grafana.com/docs/loki/latest/query/query_examples/

## Issues Found
- The introduction claimed the guide covered all metric query functions and aggregation patterns, but the official Loki documentation includes additional supported functions and operators such as `rate_counter`, `sort`, `sort_desc`, `vector`, and experimental `approx_topk`. Changed the wording to "common metric query functions and aggregation patterns."
- The standalone `unwrap` example was not a complete metric query. LogQL unwrapped ranges are used by range aggregation functions, so the example was changed to an `avg_over_time(... | unwrap duration [5m])` metric query.
- The log volume growth example used a subquery-style expression around `bytes_over_time`. Replaced it with a standard current-versus-previous-hour comparison using `bytes_over_time` and the documented `offset` modifier.

## Review Notes
- The remaining examples match documented LogQL metric-query patterns, including log range aggregations, unwrapped range aggregations, vector aggregations with `by` and `without`, binary arithmetic, comparison operators, `bool`, `on`, `ignoring`, `vector(0)`, and `offset`.
- The unwrap examples assume the parsed fields are valid numeric values. In production dashboards, add `| __error__=""` after parser or unwrap stages when input data may contain malformed JSON or non-numeric values, because Loki metric queries cannot contain pipeline errors.
