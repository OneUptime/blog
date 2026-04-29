# Validation Summary: How to Monitor IPv6 Performance Metrics Over Time - Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking
- Prometheus (server + node_exporter)
- Prometheus Python client (`prometheus_client`)
- Grafana / PromQL
- `ping6` (iputils)
- Linux `/proc/net/snmp`, `/proc/net/snmp6`, `/proc/net/netstat`
- Prometheus alerting rules

## Sources Consulted
- prometheus/node_exporter source: `collector/netstat_linux.go` — https://github.com/prometheus/node_exporter/blob/master/collector/netstat_linux.go
- node_exporter issue #1023 (additional netstat metrics) — https://github.com/prometheus/node_exporter/issues/1023
- node_exporter issue #2328 (missing TcpExt metrics) — https://github.com/prometheus/node_exporter/issues/2328
- Prometheus guide: Monitoring Linux host metrics with the Node Exporter — https://prometheus.io/docs/guides/node-exporter/
- Linux kernel TCP/IP MIB definitions (`/proc/net/snmp` per RFC 1213, `/proc/net/snmp6` per RFC 2465)
- iputils `ping6` man page (RTT line format `rtt min/avg/max/mdev = ... ms`)
- prometheus_client Python library docs (Gauge, start_http_server)

## Issues Found
1. **Step 4, Panel 5 — wrong metric for "TCP retransmission rate".** The post used `node_netstat_TcpExt_TCPRetransFail`, which counts retransmission *attempts that failed to send* (a small subset of retransmission events), not the canonical retransmission count. Replaced with `node_netstat_Tcp_RetransSegs` from `/proc/net/snmp` (SNMP-standard `RetransSegs`), which is the standard TCP retransmission counter and is included in node_exporter's default field filter.

2. **Step 1 — IPv6 metrics not in default scrape filter.** The post listed `node_netstat_Ip6_InReceives`, `node_netstat_Ip6_OutRequests`, and `node_netstat_Ip6_InDiscards` as available out-of-the-box. While node_exporter does parse `/proc/net/snmp6`, its default `--collector.netstat.fields` regex only exposes `Ip6_InOctets`/`Ip6_OutOctets` (plus a handful of others). I updated the metric list to feature default-exposed counters first and added an explicit note that the `Ip6_In*`/`Ip6_Out*` packet/discard counters require overriding `--collector.netstat.fields` to be scraped.

3. **Step 4, Panel 1 — non-IPv6-specific metric labeled as IPv6.** `node_network_receive_bytes_total{device="eth0"}` measures total interface bytes (IPv4+IPv6+other). Replaced with `node_netstat_Ip6_InOctets` so the panel actually reflects IPv6 traffic, matching its label. This metric is in the default field filter.

4. **Step 4, Panel 2 — added clarifying comment.** Kept `Ip6_InDiscards` (it is the right counter for the panel) but added an inline note that it requires the netstat fields override mentioned in Step 1, so readers don't see an empty graph and assume the post is wrong.

## Review Notes
- The Python ping6 RTT regex (`rtt min/avg/max/mdev = [\d.]+/([\d.]+)/([\d.]+)/[\d.]+ ms`) and packet-loss regex are correct for current iputils output and capture avg (group 1) and max (group 2) in the right order.
- `Counter` is imported from `prometheus_client` but never used in the example. Harmless; left as-is to minimize churn.
- `2001:db8::1` in the `TARGETS` list is from the RFC 3849 documentation prefix and will not respond to ping in real environments — the example clearly intends it as a placeholder, but readers should swap it for an actual target.
- `ping6` is the legacy iputils binary; recent distros also accept `ping -6 <target>`. Either works on currently supported Debian/Ubuntu releases.
- The `-i 0.2` ping interval is the minimum non-root interval allowed by iputils, so the example runs without `CAP_NET_RAW` overrides on most distros.
- `2001:4860:4860::8888` (Google) and `2606:4700:4700::1111` (Cloudflare) are correct public IPv6 resolver addresses.
- Prometheus YAML, scrape configuration, and alerting rule syntax are valid for current Prometheus 2.x / 3.x.
