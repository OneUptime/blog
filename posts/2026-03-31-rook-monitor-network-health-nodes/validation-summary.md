# Validation Summary: How to Monitor Network Health Between Ceph Nodes

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (OSD, MON daemons, admin socket commands)
- Rook (Ceph on Kubernetes context)
- Prometheus (alerting rules, PromQL)
- Prometheus Node Exporter (network metrics)
- Prometheus Blackbox Exporter (active TCP probing)
- iperf3 (bandwidth testing)
- ping / ICMP (latency and packet loss measurement)
- Linux networking tools (ip, netstat, MTU testing)
- Bash scripting
- Cron scheduling

## Sources Consulted
- Ceph documentation on admin socket commands (`ceph daemon` subcommands including `perf dump`, `dump_osd_network`, `ceph health detail`, `ceph log`)
- Prometheus node_exporter metric names (`node_network_transmit_bytes_total`, `node_network_receive_bytes_total`, `node_network_transmit_drop_total`, `node_network_transmit_errs_total`, `node_network_carrier_changes_total`, `node_network_up`)
- Prometheus alerting rules YAML syntax and PromQL expression format
- Prometheus blackbox exporter configuration format and standard relabeling patterns
- iperf3 JSON output structure (`-J` flag, `end.sum_received.bits_per_second` path)
- Linux `ping` command output format (`rtt min/avg/max/mdev` line, packet loss line field positions)
- Linux `ping -M do` for Don't Fragment bit (MTU path discovery)
- ICMP/IP header overhead calculation (20-byte IP header + 8-byte ICMP header = 28 bytes)

## Issues Found

1. **Incorrect comment about P99 latency (line 52)**: The comment stated `# Alert if P99 latency exceeds 2ms`, but the script actually checks the average latency extracted from `ping -q` output (which reports min/avg/max/mdev, not percentiles). Changed to `# Alert if average latency exceeds 2ms`.

2. **Invalid Ceph admin socket command (line 88)**: The command `ceph daemon osd.0 dump_osd_network_stats` used a non-existent subcommand. The correct command is `dump_osd_network` (without the `_stats` suffix), available since Ceph Nautilus. Changed to `ceph daemon osd.0 dump_osd_network`.

## Review Notes
- The Blackbox Exporter Prometheus scrape config is missing the common best-practice relabel rule `source_labels: [__param_target] -> target_label: instance`. Without it, all probed targets will appear as `blackbox-exporter:9115` in the `instance` label, making dashboards and alerts harder to use. This is a best practice rather than a functional error — probing still works correctly.
- The monitoring script pings each node twice (once for latency, once for packet loss). This could be optimized to a single ping invocation, capturing both metrics from one run. Not a correctness issue.
- All Prometheus metric names, PromQL expressions, and alert rule YAML syntax are correct.
- The MTU overhead calculation (size + 28 bytes for IP + ICMP headers) is correct, yielding tests for 1500, 4028, and 9000 byte MTU paths.
- The iperf3 JSON output path and ping output field parsing are both correct.
- Ceph port numbers used (6800 for OSDs, 6789 for MONs) are the correct defaults.
