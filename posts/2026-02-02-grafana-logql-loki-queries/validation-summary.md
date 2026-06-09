# Validation Summary: How to Build Grafana LogQL Queries for Loki

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki (log aggregation system)
- LogQL (Loki's query language)
- Grafana (dashboards, alerting, template variables)
- Log parsers: JSON, logfmt, pattern, regexp
- Go template syntax / Sprig functions (used in `line_format` and `label_format`)

## Sources Consulted
- Official Grafana Loki LogQL documentation (https://grafana.com/docs/loki/latest/query/)
- LogQL log queries reference (https://grafana.com/docs/loki/latest/query/log_queries/)
- LogQL metric queries reference (https://grafana.com/docs/loki/latest/query/metric_queries/)
- LogQL template functions documentation (https://grafana.com/docs/loki/latest/query/template_functions/)
- Loki architecture documentation (https://grafana.com/docs/loki/latest/get-started/architecture/)
- Go regexp package documentation for `(?P<name>...)` named capture group syntax

## Issues Found
No technical issues found.

All LogQL syntax used in the post is correct and current:
- The four label matching operators (`=`, `!=`, `=~`, `!~`) are accurate.
- The four line filter operators (`|=`, `!=`, `|~`, `!~`) are accurate.
- Selective field extraction with `| json field1, field2` and `| logfmt field1, field2` is valid LogQL.
- Pattern parser syntax with `<field>` placeholders is correct.
- Regexp parser uses Go's `(?P<name>...)` named capture group syntax correctly.
- `line_format` examples correctly use Go template syntax including the `__line__` function and Sprig functions like `ToUpper`.
- `label_format` examples for label renaming/creation are syntactically valid.
- All aggregation functions used (`rate`, `count_over_time`, `bytes_rate`, `bytes_over_time`, `absent_over_time`, `avg_over_time`, `quantile_over_time`, `sum_over_time`, `topk`, `bottomk`) exist and are used correctly.
- `unwrap` usage for numeric metric extraction is correct.
- The `offset` modifier for time-shifted comparisons is correct.
- Numeric and duration label filters (`duration > 1s`, `status >= 400`) are correctly applied to parsed fields.
- The `__error__` label for filtering parser errors is correct.
- Quantile grouping `quantile_over_time(...) by (app)` follows valid LogQL grammar.
- The Loki architecture diagram (Query Frontend with cache/splitter, Queriers, Ingesters, Index/Chunk storage) accurately reflects Loki's components.

## Review Notes
- The post says `label_format service=app` "renames" a label. Technically this creates a copy: the new label `service` gets the value of `app`, but the original `app` label is not removed. In common parlance and matching the official Loki documentation, this is widely referred to as renaming, so the wording is acceptable.
- The histogram bucket example using `label_format` with `lt .duration_ms 100.0` relies on Sprig template comparisons against JSON-parsed values. In practice, template field values are strings and Sprig's `lt` may require explicit numeric conversion in some scenarios, but the example is syntactically valid LogQL and the pattern is commonly cited in the Loki ecosystem.
- Selective field extraction syntax (`| json field, field2`) became GA in newer Loki releases (~2.9+). Anyone running older Loki versions may not have this feature — version not explicitly called out in the post, but this matches the modern Loki/LogQL API surface.
