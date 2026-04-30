# Validation Summary: How to Understand IPv6 Node Requirements (RFC 6434)

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- IPv6
- RFC 6434
- RFC 8504
- ICMPv6
- Neighbor Discovery (NDP)
- Stateless Address Autoconfiguration (SLAAC)
- Duplicate Address Detection (DAD)
- Path MTU Discovery (PMTUD)
- DNS (`AAAA`, `PTR`, EDNS(0))
- Linux networking tools (`ip`, `ping`, `tracepath`, `ip6tables`, `dig`, `nslookup`, `sysctl`)

## Sources Consulted
- RFC 6434, "IPv6 Node Requirements": https://www.rfc-editor.org/info/rfc6434
- RFC 8504, "IPv6 Node Requirements": https://www.rfc-editor.org/info/rfc8504
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification": https://www.rfc-editor.org/info/rfc4443
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://www.rfc-editor.org/info/rfc4861
- RFC 4862, "IPv6 Stateless Address Autoconfiguration": https://www.rfc-editor.org/info/rfc4862
- RFC 3596, "DNS Extensions to Support IP Version 6": https://www.rfc-editor.org/info/rfc3596
- RFC 8201, "Path MTU Discovery for IP version 6": https://www.rfc-editor.org/info/rfc8201
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `tracepath(8)` manual page: https://man7.org/linux/man-pages/man8/tracepath.8.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ip6tables(8)` manual page: https://man7.org/linux/man-pages/man8/ip6tables.8.html
- Linux `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local command help and behavior checks: `ping6 -h`, `tracepath -h`, `ip -6 route help`, `ip6tables -p ipv6-icmp -h`, `dig -h`, `nslookup -type=AAAA google.com`

## Issues Found
- The introduction treated RFC 6434 as the current IPv6 node requirements document. I corrected it to note that RFC 6434 obsoleted RFC 4294 and was later obsoleted by RFC 8504.
- The post cited RFC 8201 as if it were the RFC referenced by RFC 6434 for Path MTU Discovery and described PMTUD as a MUST. I corrected that to RFC 1981 (later obsoleted by RFC 8201) and updated the language to RFC 6434's actual SHOULD requirement.
- The MLD summary implied RFC 3810/MLDv2 was the RFC 6434 baseline. I corrected it to reflect RFC 6434's MLDv1 requirement for nodes that need multicast reception, while keeping MLDv2 or Lightweight MLDv2 as the recommended direction.
- The RFC section references for Addressing and Neighbor Discovery were wrong. I corrected the Addressing reference to RFC 6434 Section 5.9 and the Neighbor Discovery reference to Section 5.2.
- The ICMPv6 and DNS sections overstated several requirements as unconditional MUSTs. I revised them to match the RFC text, including the host/router split for Router Solicitation/Advertisement and the conditional DNS resolver guidance.
- Several example commands were invalid or unreliable as written. I replaced invalid placeholder literals like `2001:db8::host` and `2001:db8::gateway`, replaced `tracepath6` with `tracepath -6`, removed the unavailable `arping6` example, and replaced the obsolete `ip -6 route show cache` example with `ip -6 route get`.
- The PMTU ping example used the wrong payload size for a 1500-byte IPv6 packet. I corrected it to a 1452-byte payload so the total IPv6 packet size is 1500 bytes.
- The privacy extensions wording implied RFC 4941 was always recommended. I narrowed that statement to the RFC 6434 context where privacy/tracking concerns apply.

## Review Notes
- RFC 6434 is still useful historical guidance, but RFC 8504 is the current obsoleting IPv6 node requirements document.
- The `ip6tables` examples remain valid on modern Linux systems, though many distributions now route them through the nftables backend.
- The Linux interface name `eth0` is example-only and may differ on real systems that use predictable interface naming.
