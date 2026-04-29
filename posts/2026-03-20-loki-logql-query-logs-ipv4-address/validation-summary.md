# Validation Summary: How to Use Loki LogQL to Query Logs by IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana dashboard variables
- RE2 regular expressions
- NGINX/common log format parsing

## Sources Consulted
- Grafana Loki Log queries documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki Metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki Matching IP addresses documentation: https://grafana.com/docs/loki/latest/query/ip/
- Grafana Loki Label best practices: https://grafana.com/docs/loki/latest/get-started/labels/bp-labels/
- Grafana Loki template variables documentation: https://grafana.com/docs/grafana/latest/datasources/loki/template-variables/
- Grafana variables documentation (text box variables): https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/

## Issues Found
1. The JSON example parsed the line but did not actually filter by the extracted `client_ip`. Updated it to use `| json | client_ip = ip("203.0.113.42")`, which matches how parsed labels are filtered in LogQL.

2. The post relied on substring and regex matching for examples that were presented as IP-address queries. Updated the exact-match and subnet examples to use Loki’s built-in `ip()` matcher, which is the documented IP-aware approach for line and label filters.

3. The pattern example used a parsed label named `ip`, which made the later comparison with the `ip()` matcher ambiguous to read. Renamed the extracted field to `client_ip` for clarity and consistency with the rest of the post.

4. The comment `Unpack common log format` was incorrect because the query used the `regexp` parser, not the `unpack` parser. Corrected the wording to `Parse common log format with regexp`.

5. The Grafana variable example used `label_values({job="nginx"} | regexp ..., client_ip)`, but Loki query variables support label values from a label name and optional stream selector, not a parser pipeline that creates query-time labels. Replaced it with a text box variable example, which is the accurate Grafana approach when filtering on an IP parsed at query time.

6. The cheat-sheet error-rate query filtered on `status_code` without first parsing structured fields. Updated it to parse JSON before applying `remote_addr` and `status_code` filters, making the query valid.

7. The 4xx-count example used a regexp that captured both 4xx and 5xx statuses, then filtered back down to 4xx. Tightened the regexp to capture only `4xx`, matching the section heading directly.

## Review Notes
- The metric queries using `rate()` and `count_over_time()` with extracted `client_ip` labels are valid; Loki makes extracted labels available for later filtering and aggregation stages.
- IP addresses are usually high-cardinality values. Loki’s current guidance is to avoid turning highly dynamic fields into indexed labels unless there is a clear reason; query-time parsing or structured metadata is often the safer default.
- No version-specific incompatibilities were found for current Loki v3.7.x and Grafana v13 documentation after the corrections above.
