# Validation Summary: How to Understand IPv6 Header Efficiency vs IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IPv6
- IP fragmentation
- Path MTU Discovery (PMTUD)
- Linux networking tools (`tracepath`, `iproute2`, `sysctl`)

## Sources Consulted
- RFC 791, "Internet Protocol" - https://www.rfc-editor.org/rfc/rfc791.html
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 8201, "Path MTU Discovery for IP version 6" - https://www.rfc-editor.org/rfc/rfc8201.html
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local command documentation and checks: `man 8 tracepath`, `man 8 ip-route`, `man 8 sysctl`, `ip -6 route get`, `sysctl -a`

## Issues Found
- The post said IPv6 efficiency came from removed "fragmentation overhead". I changed this to removed "in-network fragmentation overhead" because IPv6 still supports fragmentation, but only at the source via the Fragment header.
- The checksum comparison note said "L2 and L4 provide checksums". I changed this to "No IPv6 header checksum in the base header" because the original wording overstated the guarantee and the technically relevant point is that IPv6 removed the base-header checksum.
- The Linux command `sysctl net.ipv6.conf.all.mtu_disc_policy` was invalid. I verified locally that this key does not exist and replaced it with `sysctl net.ipv6.route.mtu_expires`, which is a real Linux setting related to learned PMTU information lifetime.
- The PMTU example `ip -6 route get 2001:db8::1 | grep mtu` was not reliable as written. The reserved documentation address `2001:db8::1` is not a practical probe target, and `ip route get` does not consistently print a learned PMTU. I replaced it with `tracepath -6 2606:4700:4700::1111`, which `tracepath(8)` documents as discovering MTU along the path.
- The overhead section referred to a "1500-byte Ethernet frame" and "jumbo frames (9000 bytes)" while using MTU-sized math. I changed that wording to "1500-byte Ethernet MTU" and "9000-byte MTUs" to match the calculations.

## Review Notes
- The core protocol comparison is correct after the fixes: IPv6 has a fixed 40-byte base header, uses extension headers for optional functionality, removes the IPv4 base-header checksum, and leaves fragmentation to source nodes rather than routers.
- The C snippet is conceptual rather than production router code. That is acceptable in context because it illustrates the per-hop checksum-update difference rather than a concrete API.
