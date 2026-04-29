# Validation Summary: How to Measure IPv6 Latency and Jitter

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMP and `ping` (`iputils`)
- `iperf3`
- Bash
- Python
- Pandas
- Matplotlib
- Grafana

## Sources Consulted
- iputils `ping` manual/source: https://raw.githubusercontent.com/iputils/iputils/master/doc/ping.xml
- ESnet iperf3 invocation docs: https://raw.githubusercontent.com/esnet/iperf/master/docs/invoking.rst
- ESnet iperf3 UDP implementation source: https://raw.githubusercontent.com/esnet/iperf/master/src/iperf_udp.c
- ESnet iperf3 reporting and JSON source: https://raw.githubusercontent.com/esnet/iperf/master/src/iperf_api.c
- Python `statistics` documentation: https://docs.python.org/3/library/statistics.html
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://datatracker.ietf.org/doc/rfc8200/
- Grafana CSV data source documentation: https://grafana.com/docs/plugins/marcusolsson-csv-datasource/latest/

## Issues Found
- Replaced `ping6` with `ping -6`. Current iputils documentation describes IPv6 selection via `-6`, and notes that `ping6` was merged into `ping`.
- Corrected the packet-size explanation from IPv6 "fragmentation behavior" to path MTU behavior. Under RFC 8200, IPv6 fragmentation is source-only, not router-driven in transit.
- Fixed the jumbo-frame payload example from `-s 8972` to `-s 8952`. In iputils, `-s` is the ICMP payload size, so `8952 + 8` bytes of ICMPv6 plus the 40-byte IPv6 header yields an approximately 9000-byte IPv6 packet.
- Clarified `mdev` as RTT variability and a practical jitter proxy instead of presenting it as literal jitter.
- Corrected the iperf3 JSON workflow so the client captures receiver-side interval jitter with `--get-server-output` while the server runs in JSON mode. The original client-side `data["intervals"]` approach could miss jitter fields because iperf3 computes UDP jitter on the receiver side.
- Updated the Python parser to read `server_output_json["intervals"]` when present and to avoid calling `statistics.stdev()` on fewer than two samples, which would raise `StatisticsError`.
- Changed the Grafana note from a generic "file datasource" to a CSV-capable datasource plugin, which matches current Grafana documentation.

## Review Notes
- The examples are Linux-oriented and assume iputils-style `ping` output.
- The Bash monitoring script uses `grep -oP`, which depends on GNU `grep` with PCRE support and is not portable to every Unix environment.
