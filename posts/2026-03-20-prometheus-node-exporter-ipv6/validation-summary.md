# Validation Summary: How to Configure Prometheus Node Exporter IPv6 Metrics

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Prometheus Node Exporter
- Prometheus and PromQL
- Linux networking statistics (`/proc/net/netstat`, `/proc/net/snmp`, `/proc/net/snmp6`, `/proc/net/dev`)
- systemd
- Grafana

## Sources Consulted
- Prometheus Node Exporter README and collector list: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter `netstat` collector source: https://raw.githubusercontent.com/prometheus/node_exporter/master/collector/netstat_linux.go
- Prometheus Node Exporter `netdev` collector source: https://raw.githubusercontent.com/prometheus/node_exporter/master/collector/netdev_linux.go
- Official Prometheus guide for Node Exporter metrics and example queries: https://prometheus.io/docs/guides/node-exporter/
- Official Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Official Prometheus Node Exporter demo metrics endpoint: https://node.demo.prometheus.io/metrics

## Issues Found
1. **`node_network_*` metrics were described as IPv6-specific when they are not**: Upstream `netdev` metrics are per-interface counters sourced from link/device statistics, not IPv4/IPv6-separated counters. I corrected the introduction, metric descriptions, and PromQL examples so the post now distinguishes interface totals from actual IPv6 stack counters.
2. **Several `node_netstat_Ip6_*` examples were presented as if they were exposed by default**: Current upstream `node_exporter` filters `netstat` fields with `--collector.netstat.fields`, and metrics such as `node_netstat_Ip6_InReceives`, `node_netstat_Ip6_OutRequests`, `node_netstat_Ip6_OutNoRoutes`, `node_netstat_Ip6_ReasmOKs`, and `node_netstat_Ip6_FragOKs` are not exported by the default regex. I added the required `--collector.netstat.fields='^(Ip6_.*|Icmp6_.*|TcpExt_TCPSynRetrans)$'` configuration to the shell and systemd examples and updated the surrounding explanation.
3. **`TcpExt_TCPSynRetrans` was labeled as an IPv6-specific TCP metric**: It is a TCP extension retransmission counter, not an IPv6-only counter. I corrected the description to avoid implying protocol-family specificity that the metric does not have.
4. **The `netstat` collector explanation overstated how little configuration was needed**: The original post said the collector needed enabling "for IPv6" and concluded that `/proc/net/snmp6` telemetry required no additional configuration. In current upstream Node Exporter, `netstat` is already enabled by default, but the broader IPv6 counters used in the post require a wider `--collector.netstat.fields` pattern. I updated both statements accordingly.

## Review Notes
- `--collector.netstat` and `--collector.netdev` are currently enabled by default in upstream Node Exporter, so leaving them in the startup examples is explicit but redundant.
- `node_network_*` remains useful for per-interface troubleshooting, but Node Exporter does not expose per-interface IPv6-only byte counters through that metric family.
- The `Ip6_*` metrics in this guide depend on Linux exposing `/proc/net/snmp6`; on systems with IPv6 disabled, upstream `node_exporter` handles the missing file by returning no SNMP6 metrics.
- The systemd `ExecStart` example was syntax-checked locally with `systemd-analyze verify`; the only validation warning in this workspace was that `/usr/local/bin/node_exporter` does not exist here.
