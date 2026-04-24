# Validation Summary: How to Monitor IPv4 Network Traffic with Prometheus and Node Exporter

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus Node Exporter
- systemd
- Grafana
- Linux network interface statistics

## Sources Consulted
- Prometheus Node Exporter repository and collector documentation: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter latest release: https://github.com/prometheus/node_exporter/releases/latest
- Node Exporter `netdev` collector source: https://raw.githubusercontent.com/prometheus/node_exporter/master/collector/netdev_common.go
- Node Exporter `netstat` collector source: https://raw.githubusercontent.com/prometheus/node_exporter/master/collector/netstat_linux.go
- Prometheus PromQL functions reference (`rate`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL operators reference (`topk`): https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus configuration reference (`relabel_configs`): https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Linux kernel interface statistics documentation: https://docs.kernel.org/networking/statistics.html
- RFC 2012 TCP MIB (`tcpCurrEstab`, `tcpInSegs`, `tcpRetransSegs` semantics): https://datatracker.ietf.org/doc/rfc2012/
- `systemctl(1)` local manual page

## Issues Found
- The release download command used a wildcard in the GitHub asset URL (`node_exporter-*.linux-amd64.tar.gz`), which does not resolve to a valid asset. I replaced it with the correct release URL pattern and pinned the current latest version at validation time (`1.11.1`).
- The post described `node_network_*` interface counters as IPv4 traffic metrics. These are network interface statistics, not IPv4-only counters, so I corrected the title, tags, description, and introductory wording to remove the IPv4-specific claim.
- The `topk` query used invalid PromQL syntax (`topk(...) by (...)`). I corrected it to valid `topk(5, ...)` syntax.
- The “Total bandwidth” query divided by `1048576` while labeling the result as Mbps. I changed the divisor to `1000000` so the units match decimal Mbps.
- The TCP section described the `netstat` collector as tracking TCP connection states and labeled `node_netstat_Tcp_CurrEstab` as only ESTABLISHED connections. I corrected the section to describe TCP/IP stack statistics and updated the metric note to match the TCP MIB definition of `CurrEstab` (ESTABLISHED or CLOSE-WAIT).

## Review Notes
- `netdev` and `netstat` are enabled by default in current Node Exporter releases, so the explicit collector flags are redundant but valid.
- The install snippet is now correct as of April 24, 2026, but the pinned `1.11.1` version will need to be updated when newer Node Exporter releases are published.
