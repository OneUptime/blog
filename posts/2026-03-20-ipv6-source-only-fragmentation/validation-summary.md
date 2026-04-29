# Validation Summary: How to Understand Why Only the Source Can Fragment in IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4 and IPv6 fragmentation
- ICMPv6
- Path MTU Discovery (PMTUD)
- Linux networking tools (`ip`, `tcpdump`, `nstat`)
- Bash

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 8201: Path MTU Discovery for IP version 6: https://datatracker.ietf.org/doc/html/rfc8201
- RFC 4443: Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification: https://datatracker.ietf.org/doc/html/rfc4443
- RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local command verification on the review host: `ip -6 route help`, `ip link help`, `tcpdump -d 'icmp6 and ip6[40] == 2'`, `sysctl -a`, `nstat -az`

## Issues Found
1. **Fragment Identification scope was incorrect**: The post said IPv6 fragment Identification values must be unique per 5-tuple. RFC 8200 scopes this to the source and destination address pair for recently fragmented packets, so that wording was corrected.

2. **PMTUD behavior was overstated**: The original text said the source learns the path MTU and sends correctly sized packets "forever after". RFC 8201 makes clear that PMTU can change over time, so the wording was changed to reflect that PMTU state must be refreshed as paths change.

3. **One rationale bullet attributed the benefit incorrectly**: The "Correctness" bullet claimed routers lack protocol context needed to create correct IPv6 fragments. That is not the key standards-based reason given here, so it was replaced with a more accurate architectural statement: fragmentation is an endpoint responsibility and routers either forward or send ICMPv6 Packet Too Big.

4. **Several Linux PMTU commands were stale or incorrect**: The original post used `ip -6 route show cache` as a PMTU cache viewer, referenced a nonexistent `/proc/sys/net/ipv6/conf/all/path_mtu_discovery` sysctl, and suggested `/proc/net/snmp6 | grep Pmtu`, which does not expose those counters on the review host. These were replaced with commands that work on current Linux systems: `ip -6 route get 2001:db8::1`, `/proc/sys/net/ipv6/route/mtu_expires`, and `nstat -az`.

5. **The interface MTU test explanation was inaccurate**: Lowering the local interface MTU to 1280 does not by itself demonstrate downstream ICMPv6 Packet Too Big behavior. The surrounding explanation was corrected to describe what actually happens locally: traffic above that MTU must be reduced or fragmented at the source.

6. **The source-fragmentation section made a few inaccurate claims**: The opening sentence implied source fragmentation is specifically what happens when PMTUD is not used; the section now explains it in terms of packets larger than the current path MTU. An unsupported "30-50%" middlebox drop-rate figure was removed. The TCP note was also corrected so it no longer claims PMTUD changes the negotiated MSS option itself; instead it now describes PMTUD changing the effective send size during the connection.

7. **The IPv4 comparison overclaimed source flexibility**: "Can just send packets any size" was too broad. It was corrected to the narrower and accurate claim that IPv4 sources with `DF=0` can send packets larger than the path MTU and rely on routers to handle downstream size mismatches.

8. **The security example wording was too narrow**: The original fragment-attack line implied those attacks specifically exploited router fragmentation. It was revised to the more accurate "fragmentation and reassembly behavior".

## Review Notes
- The shell examples are Linux-specific and assume `iproute2`, `tcpdump`, and `nstat` are available.
- RFC 8200 strongly recommends PMTUD, but it still permits minimal IPv6 implementations that simply send packets no larger than 1280 bytes.
- RFC 8201 notes that classic PMTUD depends on receiving ICMPv6 Packet Too Big messages; Packetization Layer PMTUD is a more robust alternative when ICMPv6 is filtered.
