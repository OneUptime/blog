# Validation Summary: How to Follow NSA IPv6 Security Guidance

## Status
validated

## Post Type
Guide / Best Practices reference

## Technologies Covered
- IPv6 protocol and transition mechanisms (6to4, 6in4, Teredo, ISATAP)
- Linux `ip` (iproute2) command
- iptables (Linux netfilter)
- Cisco IOS first-hop security (RA Guard, DHCPv6 Guard, ND inspection, SAVI)
- ICMPv6 (Router Advertisements / NDP)
- tcpdump BPF filters
- Network security architecture (firewalls, IDS/IPS, SIEM, NetFlow/IPFIX)

## Sources Consulted
- RFC 3056 — Connection of IPv6 Domains via IPv4 Clouds (6to4): https://www.rfc-editor.org/rfc/rfc3056
- RFC 3068 — An Anycast Prefix for 6to4 Relay Routers (192.88.99.0/24): https://www.rfc-editor.org/rfc/rfc3068
- RFC 7526 — Deprecating Site-Local 6to4: https://www.rfc-editor.org/rfc/rfc7526
- RFC 4380 — Teredo (UDP/3544): https://www.rfc-editor.org/rfc/rfc4380
- RFC 4213 — Basic Transition Mechanisms for IPv6 Hosts and Routers (protocol 41): https://www.rfc-editor.org/rfc/rfc4213
- RFC 4861 — Neighbor Discovery for IP version 6 (ICMPv6 type 134 = RA): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4193 — Unique Local IPv6 Unicast Addresses (fc00::/7 / fd00::/8): https://www.rfc-editor.org/rfc/rfc4193
- IANA Protocol Numbers (41 = IPv6, 47 = GRE): https://www.iana.org/assignments/protocol-numbers
- Cisco IOS IPv6 First-Hop Security Configuration Guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/15-2mt/ip6f-15-2mt-book.html
- Cisco IOS Security Command Reference — `ipv6 access-class`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/a1/sec-a1-cr-book/sec-cr-i2.html
- Google Public DNS (IPv6 anycast 2001:4860:4860::8888): https://developers.google.com/speed/public-dns/docs/using
- NSA Cybersecurity Information Sheet — IPv6 Security Guidance: https://media.defense.gov/2023/Jan/18/2003145994/-1/-1/0/CSI_IPV6_SECURITY_GUIDANCE.PDF

## Issues Found

1. **Section 7 — Cisco vty IPv6 ACL command was wrong.** The post used `access-class IPv6-MGMT-ACL in`, but the `access-class` command on Cisco IOS applies an IPv4 ACL to a vty line. To restrict management access via an IPv6 ACL, the correct command is `ipv6 access-class IPv6-MGMT-ACL in`. Changed to the IPv6-prefixed form.
2. **Section 7 — Invalid IPv6 literal in the example ACL.** The post had `permit ipv6 fd00:mgmt::/48 any`. The string `mgmt` contains characters (`m`, `g`, `t`) that are not valid hexadecimal, so the literal would be rejected by the parser even as an illustrative snippet. Replaced with a valid placeholder ULA prefix `fd00:dead:beef::/48` (still ULA per RFC 4193, all-hex, conventional placeholder).

## Review Notes

- `ping6` is still functional on most Linux distros, but on iputils-based systems it has been merged into `ping -6`. Both work; the post's usage is fine and is the form most readers will recognize.
- The 6to4 anycast relay prefix `192.88.99.0/24` (RFC 3068) was formally deprecated by RFC 7526. The post correctly labels 6to4 as deprecated, and blocking that prefix at the perimeter is still valid hardening guidance because legacy implementations may still attempt to use it.
- The Cisco snippet uses `ipv6 nd inspection attach-policy DEFAULT`. `DEFAULT` is the predefined ND inspection policy on IOS/IOS-XE; some deployments prefer to attach a named custom policy, but the snippet as written is valid.
- The tcpdump filter `'icmp6 and ip6[40] == 134'` correctly matches RA messages assuming no IPv6 extension headers between the fixed header and ICMPv6. Worth noting in a future revision since attackers can prepend extension headers to evade naive filters; for SOC-grade detection, prefer NDP-aware tooling (e.g., NDPMon) over a single BPF expression.
- The NSA's published guidance (CSI, January 2023) is the most likely document being referenced; the post's recommendations align with it.
