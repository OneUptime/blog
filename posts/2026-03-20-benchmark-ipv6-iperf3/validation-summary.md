# Validation Summary: How to Benchmark IPv6 with iperf3

## Status
validated

## Post Type
Guide

## Technologies Covered
- iperf3
- IPv6
- TCP
- UDP
- Bash
- jq

## Sources Consulted
- ESnet iperf3 manual and option reference: https://software.es.net/iperf/invoking.html
- Official iperf3 source repository: https://github.com/esnet/iperf
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 768, User Datagram Protocol: https://www.rfc-editor.org/rfc/rfc768

## Issues Found
- The examples used `2001:db8::server` as if it were an IPv6 literal. That is not a valid IPv6 address. I replaced those examples with `2001:db8::1`, which is valid within the RFC 3849 documentation prefix.
- The explanation for `-P 4` said it "better utilizes multi-core NICs". ESnet's iperf3 documentation describes parallel streams as useful for increasing throughput on CPU-limited paths, so I corrected the explanation to match the documented behavior.
- The UDP `-l 1400` comment described `1500` as an "IPv6 MTU". RFC 8200 defines the IPv6 minimum link MTU as `1280`, not `1500`, so I corrected the note to describe `1400` as leaving room for IPv6 and UDP headers on a 1500-byte path MTU.
- The socket-buffer section described `128K` as the default for `-w` and suggested the connection line validated the effective window size. ESnet's iperf3 documentation says `-w` sets socket buffer or window size, and on Linux the effective maximum may be about double the requested value. I corrected the comments accordingly.
- The scripted `jq` parser assumed every result would expose `.end.sum_received.bits_per_second`. I updated it to fall back to `.end.sum.bits_per_second` so it remains compatible with UDP JSON layouts across iperf3 versions.

## Review Notes
- The post is technically relevant and contains working `iperf3` examples after the corrections above.
- `--bidir` is documented in current ESnet iperf3 releases. Readers on much older iperf3 builds may not have the same behavior or JSON layout, especially for UDP output.
