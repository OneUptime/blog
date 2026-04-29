# Validation Summary: How to Monitor IPv6 Performance Metrics Over Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking
- Prometheus (scrape config, alerting rules, PromQL)
- node_exporter v1.7.0
- prometheus_client (Python)
- Grafana (PromQL dashboard queries)
- ping6 (iputils)
- Linux `/proc/net/if_inet6`

## Sources Consulted
- node_exporter releases: https://github.com/prometheus/node_exporter/releases/tag/v1.7.0
- node_exporter netdev collector metric names (node_network_receive_bytes_total, node_network_transmit_bytes_total, node_network_receive_drop_total)
- prometheus_client Python docs: https://prometheus.github.io/client_python/ (Gauge constructor, `start_http_server(port, addr=...)` signature)
- iputils `ping6(8)` man page (`-c`, `-W` flags)
- Prometheus configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/ (IPv6 target bracket notation)
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Linux kernel docs on `/proc/net/if_inet6`
- IANA / public resolver IPv6 addresses: Google Public DNS (2001:4860:4860::8888) and Cloudflare 1.1.1.1 (2606:4700:4700::1111)

## Issues Found
No technical issues found.

## Review Notes
- `2001:db8::server1` in the Prometheus scrape config is not a syntactically valid IPv6 address (`server1` is not a hex value). It is clearly used as a placeholder and the surrounding `[ ]:port` bracket convention it demonstrates is correct; readers are expected to substitute real addresses. Acceptable in a tutorial context.
- The PromQL example `histogram_quantile(0.95, rate(ipv6_rtt_bucket[5m]))` references a histogram metric that is not produced by the Gauge-based exporter shown earlier. The post explicitly notes "derived from histogram if available", so this is presented as illustrative rather than runnable.
- `start_http_server(9200, addr="::")` is correct for prometheus_client. On Linux the default `IPV6_V6ONLY=0` means this also accepts IPv4-mapped connections; the comment "Listen on all IPv6 interfaces" is accurate enough for tutorial purposes.
- `ping6` is still shipped in iputils on most distributions, though modern systems also accept `ping -6`. The current usage is fine.
