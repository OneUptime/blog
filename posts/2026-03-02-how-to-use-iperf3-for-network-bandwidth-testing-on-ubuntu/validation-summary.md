# Validation Summary: How to Use iperf3 for Network Bandwidth Testing on Ubuntu

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- iperf3 (network bandwidth testing tool)
- Ubuntu (apt package manager)
- TCP and UDP protocols
- TCP window sizing / Bandwidth-Delay Product (BDP)
- jq (for JSON parsing)
- bash scripting
- ss (socket statistics) and ufw (Ubuntu firewall)
- ethtool

## Sources Consulted
- Official iperf3 documentation: https://software.es.net/iperf/invoking.html
- iperf3 release notes: https://software.es.net/iperf/news.html
- iperf3 JSON output structure (project docs and source)

## Issues Found
No technical issues found.

All command-line flags used in the post (`-s`, `-c`, `-p`, `-D`, `-t`, `-P`, `-u`, `-b`, `-l`, `-R`, `--bidir`, `-w`, `-B`, `-J`) match the official iperf3 documentation. The default port (5201) and default test duration (10 seconds) are correct. The note that `--bidir` requires iperf3 3.7+ is accurate (it was introduced in version 3.7, released June 2019). The bandwidth-delay product calculation (1 Gbps × 100 ms = 12.5 MB) is mathematically correct. The JSON path `.end.sum_received.bits_per_second` matches iperf3's JSON output schema. The example UDP output is internally consistent (596 MBytes / 1460-byte default UDP datagram size ≈ 427k datagrams).

## Review Notes
- Binding port 443 with `iperf3 -s -p 443` would require root/sudo since it's a privileged port (<1024). The post doesn't explicitly mention this, but it's a minor usage detail rather than a technical inaccuracy.
- The `-B` flag binds to an IP address (which implicitly selects an interface), not directly to an interface name. The post's comment "(and thus interface)" correctly clarifies this nuance.
- `iperf3 -s -D` runs the server as a daemon without specifying a log destination; users may want to combine with `-I pidfile` or output redirection in production use, but this is an enhancement suggestion rather than a correction.
- The post's output examples use the `Bitrate` column header, which is current iperf3 terminology (older iperf3 versions and iperf2 used `Bandwidth`).
