# Validation Summary: How to Configure Vector for IPv6 Log Processing

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Vector (observability data pipeline)
- Vector Remap Language (VRL)
- TOML configuration
- Syslog, HTTP, socket, and file sources
- `remap`, `route`, `log_to_metric` transforms
- Elasticsearch, Loki, Vector, and Prometheus exporter sinks
- IPv6 addressing (link-local, ULA, loopback, global unicast)

## Sources Consulted
- [Vector VRL function reference](https://vector.dev/docs/reference/vrl/functions/)
- [Vector syslog source](https://vector.dev/docs/reference/configuration/sources/syslog/)
- [Vector http_server source](https://vector.dev/docs/reference/configuration/sources/http_server/)
- [Vector aggregate transform](https://vector.dev/docs/reference/configuration/transforms/aggregate/)
- [Vector route transform](https://vector.dev/docs/reference/configuration/transforms/route/)
- [Vector log_to_metric transform](https://vector.dev/docs/reference/configuration/transforms/log_to_metric/)
- [Vector Elasticsearch sink](https://vector.dev/docs/reference/configuration/sinks/elasticsearch/)
- [Vector Loki sink](https://vector.dev/docs/reference/configuration/sinks/loki/)
- [Vector vector sink](https://vector.dev/docs/reference/configuration/sinks/vector/)
- [Vector v0.24.0 release notes](https://vector.dev/releases/0.24.0/) (introduction of `is_ipv4`/`is_ipv6`)
- [Elasticsearch sink config deprecations highlight](https://vector.dev/highlights/2021-10-19-elasticsearch-config-deprecations/)

## Issues Found

1. **Step 2 — Non-existent VRL functions `parse_ip!` and `is_ip`**: The post called `parse_ip!(.message, format: "regex")` and `is_ip(.client_ip)`. Neither function exists in VRL. Replaced with `parse_regex` to extract an IP from the message and `is_ipv4` / `is_ipv6` (the actual VRL functions, added in Vector v0.24.0) to classify the address. The IPv6-category branch is now driven by `is_ipv6` rather than a heuristic `contains(":", ...)` check.

2. **Step 1 — HTTP source uses deprecated type and wrong codec direction**: The HTTP source was declared as `type = "http"` with `encoding.codec = "json"`. The `http` source name has been deprecated in favor of `http_server`, and sources use `decoding.codec` (encoding is for sinks). Updated both fields.

3. **Step 4 — `aggregate` transform on log events**: The `ipv6_aggregation` transform used `type = "aggregate"` with a route output that emits log events. The `aggregate` transform only accepts metric events (counter/distribution/gauge/histogram/set/summary) — feeding it logs would fail validation at startup. Removed the `ipv6_aggregation` block; the `log_to_metric` transform that follows already produces the counter metrics the section is about.

4. **Steps 5 & 6 — Deprecated Elasticsearch sink fields**: The Elasticsearch sink used singular `endpoint = "..."` and top-level `index = "..."`. Both were deprecated by the 0.19 Elasticsearch sink config rework: replaced with `endpoints = [...]` (array) and `bulk.index = "..."`.

## Review Notes

- The Loki sink continues to use `endpoint` (singular) — this is correct; only the Elasticsearch sink moved to a plural `endpoints` array.
- IPv6 bracket notation in the `vector` sink `address` (e.g., `[2001:db8::30]:9000`) is not explicitly documented but is the standard form for any host:port string and is accepted in practice.
- The IPv6-category classification still uses `starts_with` prefix matching for `fe80`, `fc`/`fd`, and `::1`. This is a reasonable lightweight heuristic, but for stricter classification (e.g., the full `fe80::/10` range or the `fc00::/7` ULA block) `ip_cidr_contains` would be more accurate.
- The `parse_nginx_log!(string!(.message), format: "combined")` call in Step 6 is correct, though `string!()` is not strictly required — `parse_nginx_log` accepts bytes directly.
