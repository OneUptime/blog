# Validation Summary: How to Monitor IPv6 Load Balancer Health

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- IPv6 networking and addressing (RFC 4291, RFC 3849)
- HAProxy (stats, configuration directives, CSV stats fields)
- Prometheus (scrape config, alerting rules, PromQL)
- prometheus-haproxy-exporter (Debian/Ubuntu package)
- node_exporter (IPVS collector)
- IPVS (kernel virtual server)
- curl (HTTP client, IPv6 flags)
- Bash scripting
- Grafana dashboard PromQL queries
- iproute2 (`ip -6 addr` commands)

## Sources Consulted
- HAProxy Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy CSV stats fields documentation: https://docs.haproxy.org/2.8/management.html
- prometheus/haproxy_exporter source: https://github.com/prometheus/haproxy_exporter
- HAProxy 2.x built-in Prometheus exporter docs
- prometheus/node_exporter docs: https://github.com/prometheus/node_exporter (default port 9100, IPVS collector metrics)
- Prometheus PromQL documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- RFC 4291 (IPv6 Addressing Architecture) — IPv6 addresses must use hex digits 0-9, a-f
- RFC 3849 — `2001:db8::/32` reserved for documentation
- RFC 3986 / RFC 6874 — IPv6 in URI bracket syntax
- curl manual (`-6`, `--max-time`, `-w` options)
- iproute2 manual (`ip -6 addr del` syntax)

## Issues Found

1. **Invalid IPv6 addresses with non-hex characters**: The post used `2001:db8::vip`, `2001:db8::server1`, `2001:db8::server2`, `2001:db8::server3` as example addresses. These are not valid IPv6 addresses because IPv6 only permits hexadecimal digits (0-9, a-f) per RFC 4291. The non-hex letters (v, i, p, s, r) would cause `curl`, `ip`, and HAProxy parsers to reject the address. Replaced with valid documentation-range hex addresses: `2001:db8::1` (VIP), `2001:db8::a`, `2001:db8::b`, `2001:db8::c` (backends). Updated all references including the bash script, the Grafana query (`local_address`), the `ip -6 addr del` command, and the final `curl` test.

2. **Wrong node_exporter port (9090 → 9100)**: The Prometheus scrape config listed `[::1]:9090` for the node_exporter target. Port 9090 is Prometheus's own default port; node_exporter's default listen port is 9100. Corrected to `[::1]:9100`.

3. **Incorrect alert rule label `state="DOWN"`**: The `IPv6BackendDown` alert used `haproxy_server_status{state="DOWN"} == 1`. The `haproxy_server_status` metric (in both prometheus/haproxy_exporter and HAProxy 2.x's built-in exporter) is a numeric gauge with no `state` label — the value itself encodes the state (1=UP, 0=DOWN in the typical mapping). Changed to `haproxy_server_status == 0`.

4. **Same label issue in `IPv6AllBackendsDown` alert**: `sum by (backend) (haproxy_server_status{state="UP"}) == 0` referenced a non-existent label. Replaced with `sum by (backend) (haproxy_server_status == bool 1) == 0`, which counts UP servers per backend using the bool modifier and triggers when none are UP.

5. **`histogram_quantile` over a gauge metric**: The Grafana query used `histogram_quantile(0.95, rate(haproxy_backend_response_time_average_seconds_bucket[5m]))`. HAProxy does not export a histogram for backend response time — `haproxy_backend_response_time_average_seconds` is a single gauge (the rolling average reported by HAProxy stats), so there is no `_bucket` series to feed `histogram_quantile`. Replaced with a direct gauge query: `haproxy_backend_response_time_average_seconds{backend="web_servers"}`.

## Review Notes

- The `node_exporter --collector.ipvs` flag is technically valid but redundant on Linux because the IPVS collector is enabled by default; left as-is since the flag still works and the comment treats it as illustrative.
- The `slim` CSV field is described as "max sessions" — it is actually the *configured* session limit; `smax` is the observed maximum. The phrasing is loose but acceptable for a high-level overview, so left untouched.
- The HAProxy stats credentials in the example use `admin:password`, which is fine for documentation but should be flagged as a placeholder; this is a stylistic concern rather than a technical error.
- The `prometheus-haproxy-exporter` Debian/Ubuntu package, the `--haproxy.scrape-uri` flag, and the default port 9101 are all correct.
- All `node_ipvs_*` metric names referenced (`connections_total`, `incoming_bytes_total`, `outgoing_bytes_total`, `backend_connections_active`) match the names exposed by node_exporter's IPVS collector.
- The `haproxy_backend_http_responses_total{code="5xx"}` metric (and `code` label values like `1xx`/`2xx`/.../`other`) are correct for the standard HAProxy exporters.
- The bash script's IPv6 URL syntax (`http://[$addr]$HEALTH_PATH`) correctly follows RFC 3986 bracket notation for IPv6 in URIs.
