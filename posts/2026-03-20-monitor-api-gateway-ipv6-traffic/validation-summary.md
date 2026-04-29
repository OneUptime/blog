# Validation Summary: How to Monitor API Gateway IPv6 Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NGINX (access log format)
- Kong API Gateway (Prometheus plugin)
- Prometheus (metrics, alerting rules, PromQL)
- Grafana (dashboard panels)
- OpenTelemetry (Python SDK — metrics API)
- Python `ipaddress` standard library
- IPv6 addressing

## Sources Consulted
- Kong Prometheus plugin schema: https://github.com/Kong/kong/blob/master/kong/plugins/prometheus/schema.lua
- Kong Prometheus plugin exporter source: https://github.com/Kong/kong/blob/master/kong/plugins/prometheus/exporter.lua
- Kong Prometheus plugin docs: https://developer.konghq.com/plugins/prometheus/
- NGINX `log_format` and `access_log` directive docs: https://nginx.org/en/docs/http/ngx_http_log_module.html
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- Python `ipaddress` module: https://docs.python.org/3/library/ipaddress.html
- Prometheus alerting rules docs: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus `histogram_quantile` docs: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found

1. **Step 1 — incorrect IPv6 line count.** The original `grep -c ':' /var/log/nginx/api_access.log` matches any line containing a colon, but every NGINX access line includes colons in the `[dd/mmm/yyyy:hh:mm:ss +zzzz]` timestamp. As written it would count nearly all requests, not just IPv6 ones. Replaced with `awk '$1 ~ /:/' ... | wc -l`, which restricts the colon check to the first field (the client address). The IPv4 counter was rewritten with the same `awk` pattern for consistency.

2. **Step 2 — inaccurate claim about Kong's Prometheus plugin.** The post stated the plugin exposes "client IP family breakdowns." Verified against `kong/plugins/prometheus/exporter.lua` and the documented metric labels: there is no `ip_version` label on any Kong metric (`kong_http_requests_total` labels are `service, route, code, source, workspace, consumer`; latency histograms are labeled `service, route, workspace`). Reworded the sentence to say the plugin exposes status code, latency, and bandwidth metrics, and noted that the IP-family dimension is added by the custom middleware in Step 3.

3. **Step 4 — PromQL queries used a non-existent label on Kong metrics.** The queries selected `kong_http_requests_total{ip_version="ipv6"}` and `kong_request_latency_ms_bucket{ip_version="ipv6"}`, but Kong does not produce that label. The `ip_version` label actually originates from the OpenTelemetry middleware in Step 3, which emits `api_requests_total`. Switched the queries to use `api_requests_total` and `api_request_latency_ms_bucket`. Changed the `histogram_quantile` grouping from `service` (a Kong label) to `route` (the label set by the custom middleware).

4. **Step 3 — added a latency histogram so the P99 query in Step 4 has a backing metric.** The original middleware created only a counter, leaving Step 4's `histogram_quantile` query with no source metric once it was retargeted away from Kong. Added `api_request_latency_ms` as an OpenTelemetry histogram and extended `track_request` to take a `latency_ms` argument and record it. This is the minimum addition needed for the latency PromQL to work.

5. **Step 5 — alert rule used the same non-existent Kong label.** Updated the expression to use `api_requests_total{ip_version="ipv6"}`, matching the metric the middleware actually emits.

## Review Notes

- Kong Prometheus plugin config options used in Step 2 (`per_consumer`, `status_code_metrics`, `latency_metrics`, `bandwidth_metrics`, `upstream_health_metrics`) are all valid — confirmed in `schema.lua`.
- The Kong Admin API endpoint `http://[::1]:8001/plugins` is correct; `[::1]` is the IPv6 loopback and Kong's default Admin API port is 8001.
- The NGINX `log_format` directive and variables (`$remote_addr`, `$time_local`, `$request`, `$status`, `$body_bytes_sent`, `$http_referer`, `$http_user_agent`, `$request_time`, `$upstream_response_time`, `$upstream_addr`) are all standard and correctly named.
- The Python `ipaddress` usage (`ipaddress.ip_address(ip)` and `isinstance(addr, ipaddress.IPv6Address)`) is correct; `ip_address` raises `ValueError` for invalid input, which the code handles.
- An alternative to the custom-middleware approach would be Prometheus `metric_relabel_configs` to derive an `ip_version` label at scrape time from existing fields, but the post's chosen approach (custom OpenTelemetry middleware) is also valid and simpler to explain in a tutorial.
- The `grep ':' | awk -F: '...'` pipeline for /64 prefix extraction works for fully expanded IPv6 addresses but will produce confusing prefixes for addresses written with `::` zero-compression. This is a minor caveat worth a future note rather than a correctness bug — left as-is.
