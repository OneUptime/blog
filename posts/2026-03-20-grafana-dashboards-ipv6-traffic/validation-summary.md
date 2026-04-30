# Validation Summary: How to Create Grafana Dashboards for IPv6 Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana
- Prometheus
- PromQL
- Prometheus node_exporter
- Prometheus blackbox_exporter
- Linux IP and ICMPv6 network counters

## Sources Consulted
- Grafana Dashboard HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana dashboard import docs: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana Prometheus template variables docs: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana Alerting docs: https://grafana.com/docs/grafana/latest/alerting/
- Prometheus blackbox_exporter README: https://github.com/prometheus/blackbox_exporter/blob/master/README.md
- Prometheus blackbox_exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus node_exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md
- Prometheus node_exporter netstat collector source: https://github.com/prometheus/node_exporter/blob/master/collector/netstat_linux.go
- Prometheus node_exporter example output fixture: https://github.com/prometheus/node_exporter/blob/master/collector/fixtures/e2e-output.txt
- Prometheus node_exporter uname collector source: https://github.com/prometheus/node_exporter/blob/master/collector/uname.go
- Linux kernel SNMP counter documentation: https://docs.kernel.org/networking/snmp_counter.html
- Linux kernel `/proc` networking documentation: https://docs.kernel.org/filesystems/proc.html

## Issues Found
- The original Grafana API example used the legacy `POST /api/dashboards/db` workflow without showing a current request format. I updated it to the current dashboard API at `/apis/dashboard.grafana.app/v1/namespaces/default/dashboards` and switched authentication to a bearer token because Grafana’s current docs document the new API for dashboard creation.
- The original traffic panel queried `node_netstat_Ip6_InReceives` and `node_netstat_Ip4_InReceives` while labeling the result as bytes per second. I changed the queries to `node_netstat_Ip6_InOctets` and `node_netstat_IpExt_InOctets` because those are the default exported octet counters and they match the throughput interpretation.
- The IPv6 share query referenced `node_netstat_InReceives`, which is not the correct node_exporter metric name in this context. I replaced it with `node_netstat_IpExt_InOctets` and added the dashboard instance filter so the numerator and denominator use matching IPv6 and IPv4 byte counters.
- The ICMPv6 section was labeled as message types, but the queries only returned total message and error counters. I renamed that panel section to traffic and errors and kept the queries aligned with the actual metrics.
- The blackbox example described `probe_duration_seconds` as HTTP response latency without noting IPv6-only probe requirements. I changed the wording to probe duration and added the required `preferred_ip_protocol: "ip6"` plus `ip_protocol_fallback: false` configuration note so the probe does not silently fall back to IPv4.
- The dashboard JSON excerpt used old metric names and embedded a panel `alert` block. I updated the metric names, converted the top-level example to the current `metadata` plus `spec` structure, and removed the embedded alert block because current Grafana alerting is managed separately from panel JSON.
- The community dashboard import step used `POST /api/dashboards/import` with a dashboard ID payload and claimed dashboard 1860 included IPv6 panels. I replaced that with the documented Grafana UI import flow for dashboard IDs and reworded the step to use dashboard 1860 only as a starting point.
- The IPv6 adoption panel claimed to measure how many servers have IPv6 addresses, but the original query only counted traffic counters. I changed it to explicitly measure the percentage of servers that have seen IPv6 traffic since boot and used `count(node_uname_info)` as the denominator to count hosts.

## Review Notes
- Grafana 13 deprecates legacy `/api` routes but does not remove them yet. The post now uses the newer dashboard API that Grafana documents for Grafana 12+.
- The PromQL examples rely on Linux `node_exporter` `netstat` metrics backed by `/proc/net/netstat` and `/proc/net/snmp6`; they are not portable to non-Linux node_exporter targets.
- The adoption query now measures observed IPv6 traffic, not configured IPv6 addresses. If the goal is true address inventory, the data needs to come from a different source than the netstat counters used in this post.
