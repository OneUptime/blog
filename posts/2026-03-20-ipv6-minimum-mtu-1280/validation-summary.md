# Validation Summary: How to Understand the IPv6 Minimum MTU of 1280 Bytes

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- MTU and PMTU Discovery
- ICMPv6
- 6LoWPAN
- Linux `ip` networking commands

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://datatracker.ietf.org/doc/rfc8200/
- RFC 8201: Path MTU Discovery for IP version 6 - https://datatracker.ietf.org/doc/html/rfc8201
- RFC 4443: Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification - https://datatracker.ietf.org/doc/html/rfc4443
- RFC 791: Internet Protocol - https://datatracker.ietf.org/doc/rfc791/
- RFC 1191: Path MTU Discovery - https://datatracker.ietf.org/doc/html/rfc1191
- RFC 4944: Transmission of IPv6 Packets over IEEE 802.15.4 Networks - https://datatracker.ietf.org/doc/rfc4944/
- RFC 2516: A Method for Transmitting PPP Over Ethernet (PPPoE) - https://datatracker.ietf.org/doc/html/rfc2516
- RFC 4213: Basic Transition Mechanisms for IPv6 Hosts and Routers - https://datatracker.ietf.org/doc/html/rfc4213
- RFC 2784: Generic Routing Encapsulation (GRE) - https://datatracker.ietf.org/doc/html/rfc2784
- Linux `ip` command local help/runtime checks: `ip link help`, `ip -6 link show`, `cat /proc/sys/net/ipv6/conf/lo/mtu`

## Issues Found
- The introduction and IPv4 comparison section treated `576` as an RFC 1191 "recommended minimum". I corrected this to the RFC 791 definitions: `68` bytes as the minimum forwardable IPv4 datagram and `576` bytes as the minimum reassembly capability, and noted RFC 1191's PMTU floor behavior separately.
- The "Why 1280 Bytes?" section claimed IPv6 minimum MTU must accommodate "any possible extension header combination". That overstates the standard, because extension headers are variable-length and can exceed 1280. I narrowed the statement to small/common extension-header cases.
- The ICMPv6 explanation incorrectly said ICMPv6 error messages include "at minimum the first 1280 bytes" of the offending packet. I corrected this to RFC 4443's actual rule: include as much of the offending packet as possible without exceeding the minimum IPv6 MTU.
- The Packet Too Big section and Python example were technically wrong. RFC 8201 requires nodes to discard PTB messages reporting MTU values below 1280 and never reduce PMTU below 1280. I updated both the prose and the example code accordingly.
- The sub-1280 link section said to raise the underlying link to `>= 1500` and implied the 6LoWPAN border router is the source of fragmentation. I corrected this to the actual IPv6 minimum requirement of `>= 1280` and clarified that 6LoWPAN fragmentation happens in the adaptation layer on the sending node.
- The nested-tunnel note incorrectly referred to a "reduced outer link MTU of 9000+". I corrected this to the technically accurate options: increase the outer link MTU or reduce the inner tunnel MTU.

## Review Notes
- The Linux command examples were validated locally. `ip -6 link show` and `ip link set ... mtu ...` are valid with the installed `ip` tooling, and the MTU warning pipeline runs as written.
- The IPsec overhead example is necessarily approximate because ESP overhead varies by mode, cipher suite, padding, and optional fields. The post now presents it as an example rather than a worst-case calculation.
- RFC 4944 is sufficient for the 6LoWPAN fragmentation point used here. Newer 6LoWPAN header-compression work exists, but it does not invalidate the post after the correction.
