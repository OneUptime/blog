# Validation Summary: How to Configure DS-Lite for ISP IPv4 Over IPv6 Tunneling

## Status
validated

## Post Type
Guide

## Technologies Covered
- DS-Lite
- IPv4-in-IPv6 tunneling
- IPv6
- IPv4
- AFTR
- B4
- DHCPv6
- Linux `iproute2`
- `iptables` / `ip6tables`

## Sources Consulted
- RFC 6333: Dual-Stack Lite Broadband Deployments Following IPv4 Exhaustion - https://www.rfc-editor.org/rfc/rfc6333.html
- RFC 6334: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) Option for Dual-Stack Lite - https://www.rfc-editor.org/rfc/rfc6334
- `ip-tunnel(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- ISC DHCP 4.4 `dhcp-options` manual page - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- Local CLI help and validation checks: `ip -6 tunnel help`, `ip address help`, `ip route help`, `iptables -h`, `iptables -j SNAT -h`, `iptables -m limit -h`

## Issues Found
- The AFTR and B4 tunnel examples used `ip tunnel add ... mode ip4ip6`, but DS-Lite on Linux needs an IPv6-encapsulated tunnel (`ip -6 tunnel add ... mode ipip6`). I corrected the commands and the verification commands accordingly.
- The AFTR section described the tunnel as "IPv6-in-IPv4" even though DS-Lite is IPv4-in-IPv6 per RFC 6333. I corrected the terminology in the setup and overview text.
- The AFTR and B4 used `192.0.0.1/31` and `192.0.0.2/31`, which are not the same `/31` subnet and do not match the RFC 6333 well-known DS-Lite range usage. I changed them to `192.0.0.1/29` and `192.0.0.2/29`.
- The NAT44 example used `iptables -t nat -A POSTROUTING -i aftr0 ...`, but `iptables` rejects `-i` in `POSTROUTING`. I replaced it with a valid source-subnet-based `MASQUERADE` rule for the single-B4 lab example.
- The B4 walkthrough claimed LAN clients would use the CPE as their IPv4 gateway, but it did not enable IPv4 forwarding on the Linux router. I added `net.ipv4.ip_forward=1` to make the CPE example function as described.
- The original AFTR guidance implied that a plain Linux tunnel plus `iptables` was a general ISP AFTR implementation. RFC 6333 requires the AFTR binding table to include the B4 IPv6 softwire identifier, so I clarified that the generic Linux example is only a single-B4 lab and that production AFTR deployments need DS-Lite-aware software.
- The port-sharing example attempted to match IPv6 source addresses in IPv4 `iptables` NAT rules, which is not valid and does not reflect DS-Lite AFTR behavior. I replaced that section with an RFC-based explanation of how subscriber disambiguation actually works.
- The firewall example matched `ipv6-nonxt`, but IPv4-in-IPv6 encapsulation uses protocol number 4, not IPv6 "No Next Header". I replaced it with an `ip6tables` rule matching protocol `4` and corrected the forwarding example to use valid `iptables` syntax.
- The verification section used `ip tunnel show` for IPv6-encapsulated tunnels and `ping6`; I updated those to `ip -6 tunnel show` and `ping -6` to match current Linux usage.

## Review Notes
- The DHCPv6 AFTR discovery example is consistent with RFC 6334 and ISC DHCP's documented `option dhcp6.aftr-name` syntax.
- The `conntrack -L` verification example assumes `conntrack-tools` is installed; I noted that in the post.
- The post is now technically sound as a DS-Lite overview plus single-B4 Linux lab example, but not as a complete production AFTR build guide using only generic kernel tunneling.
