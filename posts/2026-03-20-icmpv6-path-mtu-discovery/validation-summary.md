# Validation Summary: How ICMPv6 Enables Path MTU Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- Path MTU Discovery (PMTUD)
- RFC 8201 / RFC 4443 / RFC 8200
- Linux networking tools (`ip`, `ping`, `tcpdump`)
- Python `subprocess`

## Sources Consulted
- RFC 8201: Path MTU Discovery for IP version 6 - https://www.rfc-editor.org/rfc/rfc8201
- RFC 4443: Internet Control Message Protocol (ICMPv6) for IPv6 - https://www.rfc-editor.org/rfc/rfc4443
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc8200
- Linux `ip-route(8)` man page - https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ping(8)` man page - https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `pcap-filter(7)` man page - https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux `ipv6(7)` man page - https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux kernel IP sysctl documentation - https://docs.kernel.org/6.4/networking/ip-sysctl.html
- Runtime verification on the review host with current `iproute2`, `iputils`, `tcpdump`, `/proc/sys/net/ipv6/route/mtu_expires`, and `/proc/net/snmp6`

## Issues Found
- The introduction and conclusion overstated PMTUD failure behavior. I changed the wording so it correctly states that black holes occur when packets exceed the actual path MTU, not that every reduced-MTU IPv6 path fails outright.
- The PMTU aging text implied that expiry always means an immediate retry at the full first-hop MTU. I corrected this to RFC 8201's actual behavior: cached PMTU information ages, and later traffic may probe for a larger PMTU again.
- The Linux snippet referenced `/proc/sys/net/ipv6/conf/<iface>/path_mtu_discovery`, which is not a current documented IPv6 per-interface sysctl. I removed that invalid example.
- The `tcpdump` examples used raw byte offsets for ICMPv6 PTB and described IPv6 Fragment Headers as "post-PTB fragmentation". I replaced the PTB filters with documented `pcap-filter` ICMPv6 type names and removed the misleading fragmentation wording.
- The kernel counter description was wrong. I changed the post from `Ip6InTooBigErrors` to `Icmp6InPktTooBigs` for counting received ICMPv6 Packet Too Big messages.
- The Python probe example used `ping6 -M do` and error matching that did not align with current `iputils` output. I updated it to `ping -6 -M probe`, removed the unused `re` import, and made the PTB/error detection match current lowercase `message too long, mtu:` diagnostics.
- The rate-limit advice implied PTB should simply not be rate-limited. I changed it to recommend tuning ICMPv6 error-message rate limits so PTB is not suppressed too aggressively, which is consistent with RFC 4443.

## Review Notes
- `ip -6 route show cache` may legitimately print no entries unless the system currently has a cached IPv6 route exception/PMTU entry.
- The post is specifically about classical ICMPv6-based PMTUD from RFC 8201. Packetization Layer PMTUD is a related but distinct mechanism and is outside this post's scope.
