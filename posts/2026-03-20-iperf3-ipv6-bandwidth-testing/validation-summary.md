# Validation Summary: How to Use iperf3 for IPv6 Bandwidth Testing

## Status
validated

## Post Type
Guide

## Technologies Covered
- `iperf3`
- IPv6
- TCP
- UDP
- JSON output parsing with `python3`
- Bash scripting

## Sources Consulted
- ESnet iperf3 manual page: https://software.es.net/iperf/invoking.html
- ESnet iperf3 project documentation: https://software.es.net/iperf/
- ESnet iperf3 FAQ: https://software.es.net/iperf/faq.html
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200.html

## Issues Found
- Clarified the introduction to state that `iperf3` supports IPv6 natively and that `-6` forces IPv6. The original wording implied that IPv6 support depended on `-6`, but the official manual documents `-6` specifically as `--version6`.
- Corrected the default server example comment. `iperf3 -s` is documented as listening on the default port, but dual-stack behavior is OS-dependent, so claiming it always listens on both IPv4 and IPv6 was too broad.
- Corrected the MTU testing examples. `-M` sets TCP MSS, not MTU directly, and the original IPv6 values were wrong. For common IPv6/TCP cases, a 1500-byte path MTU corresponds to a 1440-byte MSS, and a 9000-byte path MTU corresponds to an 8940-byte MSS.

## Review Notes
- The local environment did not have `iperf3` installed, so command and flag validation was done against ESnet's official documentation rather than by executing the commands locally.
- The UDP `-l` examples are valid, but actual usable datagram size still depends on path MTU. When `-l` is omitted, `iperf3` attempts to choose a UDP send size based on path MTU.
