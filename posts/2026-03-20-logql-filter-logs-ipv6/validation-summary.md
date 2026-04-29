# Validation Summary: How to Use LogQL to Filter Logs by IPv6 Address

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana alerting / Loki alerting rules
- IPv6 addressing
- RE2 regular expressions

## Sources Consulted
- Grafana Loki Log queries documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki Matching IP addresses documentation: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/loki/ip/
- Grafana Loki Metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki Query best practices: https://grafana.com/docs/loki/latest/query/bp-query/
- Grafana Loki Query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Enterprise Logs alerting and recording rules documentation: https://grafana.com/docs/enterprise-logs/latest/alert/
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193

## Issues Found

1. **Exact and subnet IPv6 matching examples were too loose.** The original post used plain substring or ad-hoc regex matching for exact IPv6 and subnet filtering. I replaced those examples with LogQL's documented `ip()` matcher for exact addresses, CIDR prefixes, ranges, loopback, link-local, and unique-local matches so the queries reflect current supported syntax.

2. **The link-local and ULA classification examples were inaccurate.** The original `fe80::` regex only matched a narrow textual subset and did not accurately represent the full `fe80::/10` link-local range. The updated examples use `ip("fe80::/10")` and `ip("fc00::/7")`, which align with RFC 4291 and RFC 4193.

3. **Parsed-field examples used regex prefix checks where LogQL supports IP-aware label filters.** I updated the `json`, `pattern`, and `regexp` examples to parse fields and then filter them with `= ip(...)`, adding `__error__ = ""` after parser stages so only successful parses are used.

4. **Aggregation and alert queries grouped by `remote_addr` without extracting it first.** In the original post, `sum by (remote_addr)` and `topk(... by (remote_addr))` were applied to queries that never parsed `remote_addr`, so the examples would not work as written. I added `pattern` parsing before the metric functions and filtered parser errors before aggregation.

5. **The total request-rate example returned per-stream rates, not a total.** `rate({job="nginx", ip_version="ipv6"}[5m])` returns one series per stream. I changed it to `sum(rate(...))` so it matches the description "Rate of IPv6 requests per second."

6. **The alerting examples used brittle status-code regex scanning and one malformed per-source expression.** I replaced the 4xx/5xx line regexes with parsed `status` label filters and corrected the suspicious-source alert so it counts parsed per-IP request volumes over the time window.

7. **The "unique IPv6 sources" example used `last_over_time` incorrectly.** Per the LogQL metric query docs, `last_over_time` is for unwrapped ranges, not plain log-range aggregations. I replaced it with a valid distinct-source count built from `count_over_time(...)`, `sum by (remote_addr)`, and an outer `count(...)`.

8. **The nginx pattern parser example did not correctly account for combined-log trailing fields.** I added a trailing `<_>` capture so the example pattern can parse combined-format lines without incorrectly treating the rest of the line as the `bytes` field.

## Review Notes
- The bracket-notation example remains a regex match for URI-style `[IPv6]` text, which is appropriate for content scanning but is not a full RFC-complete IPv6 validator.
- The `ip_version="ipv6"` label is user-defined ingestion metadata, not something LogQL creates automatically. The examples assume that label is already attached during collection.
- Parser-based examples assume the logs actually follow the shown JSON, nginx, or syslog formats. Readers using different log formats will need to adjust the `pattern` or `regexp` stages accordingly.
