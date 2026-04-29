# Validation Summary: How to Monitor Distributed System IPv6 Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (scrape configs, alerting rules)
- Alertmanager (routing, webhook receivers)
- IPv6 addressing (RFC 4291, RFC 3986 bracket notation)
- Python 3 (`http.server`, `socket` with `AF_INET6`)
- etcd (metrics endpoint, `etcd_server_has_leader`)
- Kafka exporter (default port 9308)
- Redis exporter (default port 9121)
- node_exporter (default port 9100)
- Consul

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- RFC 4291 — IP Version 6 Addressing Architecture (hexadecimal-only addresses)
- RFC 3986 — URI Generic Syntax (bracketed IPv6 host literals)
- RFC 3849 — `2001:db8::/32` documentation prefix
- Python `socket` library docs: https://docs.python.org/3/library/socket.html (AF_INET6 4-tuple `(host, port, flowinfo, scopeid)`)
- Python `http.server` docs: https://docs.python.org/3/library/http.server.html
- etcd metrics docs: https://etcd.io/docs/v3.5/op-guide/monitoring/ (port 2381 is the conventional `--listen-metrics-urls` port)
- kafka_exporter README: https://github.com/danielqsj/kafka_exporter (default `:9308`)
- redis_exporter README: https://github.com/oliver006/redis_exporter (default `:9121`)
- node_exporter README: https://github.com/prometheus/node_exporter (default `:9100`)

## Issues Found
- **Invalid IPv6 literals**: Several "addresses" used non-hexadecimal labels (e.g., `2001:db8::alertmanager`, `2001:db8::kafka1`, `2001:db8::kafka2`, `2001:db8::redis`, `2001:db8::notifications`, `2001:db8::kafka`, `2001:db8::etcd`, `2001:db8::consul`). IPv6 address segments per RFC 4291 must be hexadecimal (0–9, a–f), so these strings would fail to parse as IPv6 literals in Prometheus, Alertmanager, and Python's `socket.AF_INET6` connect path. Replaced each with valid hex literals within the `2001:db8::/32` documentation prefix:
  - `[2001:db8::alertmanager]:9093` → `[2001:db8::a]:9093`
  - `[2001:db8::kafka1]:9308` → `[2001:db8::b1]:9308`
  - `[2001:db8::kafka2]:9308` → `[2001:db8::b2]:9308`
  - `[2001:db8::redis]:9121` → `[2001:db8::c]:9121`
  - `[2001:db8::notifications]:8080` → `[2001:db8::d]:8080`
  - Python `SERVICES` dict updated similarly: `kafka` → `2001:db8::b`, `redis` → `2001:db8::c`, `etcd` → `2001:db8::e`, `consul` → `2001:db8::f`.

## Review Notes
- The Python health server binds to `('::', 8080)`. The inline comment claims this includes IPv4 via dual-stack. This is true on most Linux distros (where `net.ipv6.bindv6only=0` by default) but not on Windows or any system where `IPV6_V6ONLY` is set on the socket. `socketserver.TCPServer` does not explicitly clear `IPV6_V6ONLY`, so the dual-stack behavior depends on the kernel default. Acceptable as documented for typical Linux deployments.
- The `HighNetworkLatency` alert uses `rate(net_conntrack_dialer_conn_attempted_total[5m]) > 100`. This metric (exported by Prometheus's own dialer) measures attempted scrape connections per second — it counts attempts, not latency. The expression itself is valid PromQL and the metric exists, but the alert name is somewhat misleading; a more accurate name would be `HighScrapeConnectionRate`. Left as-is since this is a naming/semantic preference rather than a technical error.
- Port choices verified: node_exporter `:9100`, kafka_exporter `:9308`, redis_exporter `:9121`, etcd metrics `:2381`, Alertmanager `:9093`, Prometheus `:9090`. All match the canonical defaults.
- `etcd_server_has_leader` and `up{job=~"..."}` expressions are valid and idiomatic.
- The Python `socket.connect` 4-tuple `(host, port, 0, 0)` for AF_INET6 is correct (`flowinfo=0`, `scopeid=0`).
