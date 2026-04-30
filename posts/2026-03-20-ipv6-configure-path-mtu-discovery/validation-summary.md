# Validation Summary: How to Configure Path MTU Discovery for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Path MTU Discovery (PMTUD)
- ICMPv6
- Linux networking
- iproute2
- iputils `ping`
- ip6tables
- nftables
- `tcpdump`
- Python

## Sources Consulted
- RFC 8201, "Path MTU Discovery for IP version 6": https://www.rfc-editor.org/rfc/rfc8201
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc4443
- RFC 4821, "Packetization Layer Path MTU Discovery": https://www.rfc-editor.org/rfc/rfc4821
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- `ipv6(7)` Linux manual page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- RFC 4890 guidance on ICMPv6 filtering: https://www.rfc-editor.org/rfc/inline-errata/rfc4890.html
- Local command/help verification: `ip -6 route help`, `ping -h`, `ip6tables -p icmpv6 -h`, `man nft`, `man pcap-filter`, `/proc/net/snmp6`, `/proc/sys/net/ipv6/route/mtu_expires`

## Issues Found
- The post referenced `/proc/sys/net/ipv6/conf/<iface>/path_mtu_discovery` and `net.ipv6.conf.all.path_mtu_discovery`, but those are not valid Linux IPv6 sysctls. I replaced them with real Linux PMTU-related inspection/tuning points: `net.ipv6.route.mtu_expires`, `ip -6 route get`, and `ip -6 route flush cache`.
- The `ip -6 route show cache` and `grep -i pmtu /proc/net/snmp6` examples were unreliable for the stated purpose. I replaced them with commands that expose current PMTU-related state on Linux and corrected the counter names and meanings.
- The `ping6` example was outdated for current iputils, and the explanation for `-M do` incorrectly implied an IPv6 DF bit. I updated the example to `ping -6`, clarified what `-M do` does on Linux, and noted that IPv6 has no DF bit.
- The PMTU black-hole section conflated cache aging with black-hole recovery. I rewrote it to distinguish IPv6 PMTU cache expiration from TCP's PLPMTUD fallback via `net.ipv4.tcp_mtu_probing`, and noted that Linux keeps TCP-wide knobs under `net.ipv4` even for IPv6 TCP.
- The nftables example omitted the `output` chain even though the surrounding text discussed allowing Packet Too Big messages in all directions. I added the matching `output` example and replaced the `tcpdump` filter with a symbolic ICMPv6 Packet Too Big filter.

## Review Notes
- `ip -6 route get` only shows `mtu` and `expires` when a PMTU exception is present for the resolved destination, so sample output can vary by kernel state and recent traffic.
- `ip -6 route flush cache` remains available in current `iproute2`, but cached route handling has changed over time; modern kernels increasingly rely on garbage collection for cached route entries.
