# Validation Summary: How to Benchmark IPv6 with iperf3 - With

## Status
validated

## Post Type
Guide

## Technologies Covered
- iperf3
- IPv6
- TCP benchmarking
- UDP benchmarking
- Bash
- `jq`
- Python 3

## Sources Consulted
- ESnet iperf3 manual and usage reference: https://software.es.net/iperf/invoking.html
- ESnet iperf3 project documentation and current release information: https://software.es.net/iperf/
- Upstream iperf3 man page source: https://github.com/esnet/iperf/blob/master/src/iperf3.1
- Upstream iperf3 JSON/reporting implementation: https://github.com/esnet/iperf/blob/master/src/iperf_api.c
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The example TCP output was mathematically inconsistent: `33.4 GBytes` over `30` seconds does not equal `9.55 Gbits/sec`. I corrected the transfer value to `35.8 GBytes` so the sample output is internally consistent.
- The prerequisites were incomplete for the included automation examples. I added `jq` for the benchmark-suite script and Python 3 for the JSON-analysis snippet.
- The Bash summary script only reported one direction for `--bidir` results. Current upstream iperf3 JSON uses separate reverse-direction keys, so I updated the script to report both forward and reverse throughput.
- The Bash summary script read UDP jitter and loss from the older ambiguous `.end.sum` structure only. I updated it to prefer `.end.sum_received` while keeping a fallback to `.end.sum`.
- The Python JSON-analysis snippet treated any result containing `sum_received` as TCP. Current iperf3 UDP JSON also includes `sum_received`, so the example would misreport UDP runs. I updated the code to branch on the reported protocol, summarize UDP correctly, and handle bidirectional TCP output explicitly.
- The comment calling `1316`-byte packets “RTP typical” was too specific and not generally accurate. I removed that parenthetical while keeping the example packet size.

## Review Notes
- No remaining technical issues found after the corrections.
- Current iperf3 releases expose additional JSON summary fields for UDP and bidirectional tests; older releases may differ, so JSON-parsing examples are most accurate when used with modern iperf3 versions.
- The example address `2001:db8::1` is appropriate for documentation and testing examples because it is part of the RFC 3849 documentation prefix.
