# Validation Summary: How to Monitor TCP Connection States on IPv4 with Prometheus

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus Node Exporter
- PromQL
- Linux TCP networking
- `ss`
- Node Exporter textfile collector

## Sources Consulted
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md
- Node Exporter `netstat` collector source: https://github.com/prometheus/node_exporter/blob/master/collector/netstat_linux.go
- Node Exporter `tcpstat` collector source: https://github.com/prometheus/node_exporter/blob/master/collector/tcpstat_linux.go
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Linux `ss(8)` manual: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux SNMP/TCP MIB definitions: https://github.com/torvalds/linux/blob/master/include/uapi/linux/snmp.h
- Linux `/proc/net/netstat` field mappings: https://github.com/torvalds/linux/blob/master/net/ipv4/proc.c
- RFC 2012, TCP MIB: https://datatracker.ietf.org/doc/html/rfc2012
- RFC 9293, TCP state machine: https://www.rfc-editor.org/rfc/rfc9293

## Issues Found
- The post described the Node Exporter `netstat` collector as exposing per-state TCP counts. I corrected this to reflect that `netstat` exposes TCP counters such as `Tcp_CurrEstab`, opens, resets, retransmissions, and listen drops, while detailed per-state counts need a state-aware source such as the `ss`-based textfile collector shown later in the post.
- The `node_netstat_Tcp_CurrEstab` description was too narrow. Per RFC 2012, `CurrEstab` counts connections in `ESTABLISHED` or `CLOSE_WAIT`, so I updated the metric table and PromQL comment accordingly.
- The `node_netstat_Tcp_EstabResets` description was incomplete. Per RFC 2012, it includes resets from `ESTABLISHED` or `CLOSE_WAIT`, so I corrected that wording.
- The `TIME_WAIT` example used `node_netstat_TcpExt_TCPTimeWaitOverflow` as if it were a current socket-count metric. I fixed the query comments to make clear that it is a cumulative overflow counter, not a gauge of current `TIME_WAIT` sockets.
- The expanded `--collector.netstat.fields` regex did not actually include `TcpExt_TCPTimeWaitOverflow`, so the example query could fail if copied as written. I added `TCPTimeWaitOverflow` to the regex and anchored it correctly.
- The `ss` textfile collector example was not IPv4-specific even though the post is about IPv4. I changed the commands to use `ss -4`.
- The `ss` example relied on stripping the header with `tail`. I replaced that with `ss -H`, which is the documented way to suppress headers.
- The post used the Node Exporter textfile collector later but did not show the required `--collector.textfile.directory` flag in the configuration example. I added that flag so the example will work as described.

## Review Notes
- `AttemptFails`, `EstabResets`, and `TCPTimeWaitOverflow` are not part of the default `netstat` field filter in current Node Exporter source; the expanded filter in the post is required if readers want those metrics.
- The alert thresholds in the examples are syntactically valid, but they are environment-specific and should be tuned per workload and baseline.
