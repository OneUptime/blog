# Validation Summary: How to Monitor IPv6 Traffic with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / technical implementation guide (Prometheus + Grafana IPv6 monitoring, with exporter configs, PromQL queries, recording/alerting rules, and Grafana dashboard JSON).

## Technologies Covered
- Prometheus (scrape config, recording rules, alerting rules, PromQL)
- Prometheus node_exporter (netstat/sockstat/netdev/conntrack/tcpstat collectors, `/proc/net/snmp6`, `/proc/net/sockstat6`)
- Prometheus snmp_exporter (IPV6-MIB / IPV6-ICMP-MIB OIDs)
- Prometheus blackbox_exporter (http/icmp/tcp/dns IPv6 probes)
- Grafana (dashboard JSON, panels, templating, transformations)
- IPv6 networking concepts (Happy Eyeballs / RFC 8305, NAT64/DNS64, ICMPv6 Neighbor Discovery)
- SNMP / MIBs (RFC 2465, RFC 2466)

## Sources Consulted
- Prometheus node_exporter source — `collector/netstat_linux.go` default `--collector.netstat.fields` regex and `/proc/net/snmp6` parsing: https://github.com/prometheus/node_exporter/blob/master/collector/netstat_linux.go
- node_exporter `collector/sockstat_linux.go` (`/proc/net/sockstat6` → `node_sockstat_*6_inuse`): https://github.com/prometheus/node_exporter/blob/master/collector/sockstat_linux.go
- node_exporter snmp6 test fixture (confirms field names): https://github.com/prometheus/node_exporter/blob/master/collector/fixtures/proc/net/snmp6
- RFC 2465 — Management Information Base for IP Version 6 (IPV6-MIB), `ipv6IfStatsTable` / `ipv6IfStatsEntry` column definitions: https://www.rfc-editor.org/rfc/rfc2465.txt
- RFC 2466 — IPV6-ICMP-MIB (OID 1.3.6.1.2.1.56)
- Prometheus blackbox_exporter configuration reference (`preferred_ip_protocol`, `ip_protocol_fallback`, prober modules)
- Prometheus documentation on metric types (gauge vs histogram) and `histogram_quantile`

## Issues Found

1. **Incorrect SNMP OIDs in the snmp_exporter config (off-by-one drift).** The config skipped column 3 (`ipv6IfStatsInTooBigErrors`) of `ipv6IfStatsEntry`, which shifted several OIDs to point at the wrong counters — a dangerous error for monitoring (the metric resolves but reads the wrong value). Verified against RFC 2465 and corrected:
   - `ipv6IfStatsInAddrErrors`: `...55.1.6.1.4` → **`.5`** (`.4` is actually `InNoRoutes`)
   - `ipv6IfStatsOutForwDatagrams`: `...55.1.6.1.11` → **`.10`** (`.11` is actually `OutRequests`)
   - `ipv6IfStatsOutDiscards`: `...55.1.6.1.15` → **`.12`** (`.15` is actually `OutFragCreates`)
   - `ipv6IfStatsOutFragOKs`: `...55.1.6.1.16` → **`.13`**
   - `ipv6IfStatsOutFragFails`: `...55.1.6.1.17` → **`.14`**
   - (`InReceives` `.1` and `InHdrErrors` `.2` were already correct and left unchanged.)

2. **Mislabeled MIB.** OID `1.3.6.1.2.1.55` was commented as "IP-MIB (IPv6)". It is the **IPV6-MIB (RFC 2465)** — "IP-MIB" is a distinct MIB (RFC 4293) rooted elsewhere. Updated the comments to `IPV6-MIB (RFC 2465)` and `IPV6-ICMP-MIB (RFC 2466)`.

3. **node_exporter does not expose most of the post's IPv6 metrics by default.** The post is built almost entirely on `node_netstat_Ip6_InReceives`, `Ip6_OutRequests`, `Ip6_InHdrErrors`, `Ip6_InDiscards`, fragmentation counters, and the IPv4 `Ip_*` comparison counters. node_exporter's netstat collector *does* parse `/proc/net/snmp6`, but its **default `--collector.netstat.fields` filter only exposes `Ip6_InOctets/OutOctets`, `Icmp6_InMsgs/OutMsgs`, and the `Udp6_*` datagram counters.** Every other `Ip6_*`/`Ip_*` metric used in the guide returns no data unless the operator overrides the fields regex. This is a correctness gap that would leave a reader's dashboards/alerts silently empty. Fixed by:
   - Adding a `--collector.netstat.fields=...` flag (with a regex covering all the fields the guide uses) to both the CLI example and the systemd unit. In the systemd unit the trailing regex anchor is written as `$$` so systemd does not interpret it as a variable expansion.
   - Adding an "Important" callout after the run commands explaining the default-filter limitation.

4. **Internal contradiction: `histogram_quantile` on a gauge in the summary table.** The body repeatedly and correctly states `probe_duration_seconds` is a Gauge (not a Histogram) and that `histogram_quantile()` must not be used on it (using `avg_over_time`/`max_over_time`/`quantile` instead). The Quick Reference table's "Probe Latency" row nonetheless listed `histogram_quantile(0.99, ...)`. Changed to `max_over_time(probe_duration_seconds[5m])` to match the corrected guidance and the alert threshold semantics.

## Review Notes
- **IPV6-MIB is deprecated.** RFC 2465's `ipv6IfStatsTable` (OID `1.3.6.1.2.1.55`) has been obsoleted by the unified IP-MIB (RFC 4293), whose `ipIfStatsTable` (`1.3.6.1.2.1.4.31.3`) reports both IPv4 and IPv6 per-interface stats keyed by an address-type index. Many modern routers/switches implement only the newer IP-MIB and may not return anything under OID 55. The post's "Wrong OIDs: use `snmpwalk` to verify" troubleshooting tip partially covers this, but a reader targeting current hardware may need the IP-MIB OIDs instead. Left as-is since the IPV6-MIB OIDs are still valid where supported; worth a future addition.
- The `quantile by (job) (0.95, probe_duration_seconds{...})` recording rule computes a quantile *across targets at an instant* rather than over time. It is valid PromQL and consistent with the gauge caveat, just a slightly unusual aggregation — acceptable.
- The Best Practices line "Use `histogram_quantile()` for latency percentiles" is correct general advice for histogram metrics and does not claim `probe_duration_seconds` is a histogram, so it was left unchanged.
- Blackbox modules, Prometheus relabel configs (target/`__param_target`/`__address__` rewrite, IPv6 `[addr]:port` bracket regex), `probe_ssl_earliest_cert_expiry`, `probe_dns_lookup_time_seconds`, `probe_http_status_code`, and the `node_sockstat_{TCP6,UDP6,RAW6,FRAG6}_inuse` metrics were all verified as correct.
- The "over 60% of cloud traffic over IPv6 in 2026" figure is a forward-looking adoption claim (Google's measured IPv6 adoption was ~45–50% in 2024–2025); it is editorial framing rather than a verifiable technical fact, so it was left unchanged.
- node_exporter `v1.8.0` and its download URL are valid. The `--collector.tcpstat` flag exists but reads `/proc/net/tcp` and can be expensive on busy hosts — fine for the example, worth noting operationally.
