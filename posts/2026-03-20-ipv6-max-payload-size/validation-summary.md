# Validation Summary: How to Calculate the Maximum Upper-Layer Payload Size in IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Path MTU Discovery (PMTUD)
- TCP MSS
- UDP
- DNS EDNS(0)
- Linux networking tools (`ss`, `ip6tables`)
- Python

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 8201: Path MTU Discovery for IP version 6 — https://www.rfc-editor.org/rfc/rfc8201.html
- RFC 6691: TCP Options and Maximum Segment Size (MSS) — https://www.rfc-editor.org/rfc/rfc6691
- RFC 6891: Extension Mechanisms for DNS (EDNS(0)) — https://www.rfc-editor.org/rfc/rfc6891
- RFC 8085: UDP Usage Guidelines — https://www.rfc-editor.org/rfc/rfc8085
- RFC 9715: IP Fragmentation Avoidance in DNS over UDP — https://www.rfc-editor.org/rfc/rfc9715.html
- RFC 791: Internet Protocol — https://www.rfc-editor.org/rfc/rfc791
- RFC 4302: IP Authentication Header — https://www.rfc-editor.org/rfc/rfc4302.html
- RFC 2784: Generic Routing Encapsulation (GRE) — https://www.rfc-editor.org/rfc/rfc2784.html
- `iptables-extensions(8)` TCPMSS target — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `ss(8)` / local `ss --help` output for current option syntax — https://manpages.debian.org/unstable/iproute2/ss.8.en.html

## Issues Found
- The introduction said IPv4 has a "minimum MTU" of 576 bytes. That is not the IPv4 minimum link MTU; 576 bytes is the historical minimum datagram size hosts must be able to reassemble. I corrected the wording to avoid conflating IPv4 reassembly requirements with link MTU.
- The `ss -6 -n -t info | grep mss` command was invalid. In current `ss`, `info` is an option (`-i` / `--info`), not a positional argument. I corrected the command to `ss -6 -n -t -i state established | grep mss`.
- The MSS explanation said the MSS option is "set" during the handshake "to prevent fragmentation". I corrected this to say MSS is advertised during the handshake and helps bound segment size, which better matches TCP and PMTU behavior.
- The DNS EDNS0 guidance recommended `MTU - IPv6 - UDP = 1452` as the EDNS buffer size. That is only the unfragmented ceiling on a 1500-byte path, not a general recommendation for IPv6 Internet paths. I changed it to a conservative 1232-byte EDNS(0) buffer size to align with current fragmentation-avoidance guidance for IPv6.
- The ip6tables comment referred to "MSS clamp" while the example used `--set-mss`, which sets a fixed MSS rather than clamping to PMTU. I corrected the comment to match the command actually shown.

## Review Notes
- The post's core payload calculations for IPv6, TCP, UDP, AH, and the Fragment header were otherwise correct for the stated assumptions.
- The Python snippets are syntactically valid and produced the expected values when executed locally.
- Actual TCP payload per packet can be smaller than the 20-byte-header examples when TCP options are present; the post's examples are correct for minimum-length TCP headers.
- Modern Linux systems often run `ip6tables` on top of the `nf_tables` backend, but the example command remains valid.
