# Validation Summary: How to Benchmark IPv6 vs IPv4 Network Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IPv6
- `iperf3`
- `ping` from `iputils`
- Bash
- Python 3
- Linux networking

## Sources Consulted
- ESnet `iperf3` documentation: https://software.es.net/iperf/invoking.html
- `ping(8)` from `iputils`: https://man7.org/linux/man-pages/man8/ping.8.html
- Official `iperf3` source for UDP JSON summary fields: https://github.com/esnet/iperf/blob/master/src/iperf_api.c
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The description and prerequisites claimed the post used `netperf`, but the article did not include any `netperf` commands or examples. I removed the `netperf` references so the post accurately reflects the tools it actually uses.
- The post used `ping6`, but current `iputils` documents `ping -6` and notes that the standalone `ping6` binary was merged into `ping`. I updated the IPv6 examples and the automation script to use `ping -6`.
- The multiline IPv4 `iperf3` command placed shell comments after line-continuation backslashes, which breaks the command in `bash`. I removed the inline comments from the continued lines so the snippet is syntactically valid shell.
- The UDP jitter section generated JSON from TCP tests and then parsed only throughput. I changed the JSON examples to run UDP tests and updated the Python snippet to compare throughput, jitter, and loss from the UDP summary fields.
- The latency interpretation attributed lower IPv6 RTT to “no NAT,” which is too broad and not reliably true. I replaced that with wording that correctly frames latency differences as generally path- and routing-dependent.
- The “CPU overhead” row claimed IPv6 is slightly higher on older kernels without sufficient support or scope. I changed it to a more accurate expectation that CPU cost is usually similar on modern systems and should be verified on the target hardware.

## Review Notes
- The example IP addresses (`192.0.2.1` and `2001:db8::1`) are valid documentation placeholders per RFC 5737 and RFC 3849, but they must be replaced with real host addresses when running the commands.
- `iperf3` UDP JSON output has varied across versions; the updated parser checks for `sum_received` first and falls back to `sum` to remain compatible with both current and older outputs.
