# Validation Summary: How to Configure DS-Lite with AFTR on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- DS-Lite
- AFTR
- IPv4-in-IPv6 tunneling
- Linux `iproute2`
- `iptables`
- DHCPv6
- ISC DHCP
- `conntrack`

## Sources Consulted
- RFC 6333, Dual-Stack Lite Broadband Deployments Following IPv4 Exhaustion: https://www.rfc-editor.org/rfc/rfc6333
- RFC 6334, DHCPv6 Option for Dual-Stack Lite: https://www.rfc-editor.org/rfc/rfc6334
- `ip-tunnel(8)` iproute2 manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `ip-link(8)` iproute2 manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- conntrack-tools user manual: https://conntrack-tools.netfilter.org/manual.html

## Issues Found
- The Linux tunnel examples used `mode ip4ip6`, but iproute2 documents the IPv4-over-IPv6 mode as `ipip6`. I changed both AFTR and B4 commands to `ip -6 tunnel add ... mode ipip6`.
- The post used invalid placeholder IPv6 literals such as `2001:db8::aftr` and `2001:db8:subscriber::1`. I replaced them with syntactically valid documentation-prefix IPv6 addresses.
- The AFTR example described a generic `any-to-any` tunnel and broad RFC 1918 routes. RFC 6333 requires AFTR behavior that keys return traffic on the subscriber IPv6 softwire endpoint, so a plain Linux `ip6tnl` + `iptables` example is only defensible as a single-B4 lab. I narrowed Method 2 accordingly and changed the routing and NAT examples to one subscriber LAN.
- The tunnel IPv4 addressing was wrong for DS-Lite. RFC 6333 reserves `192.0.0.1` for the AFTR and `192.0.0.2` for the B4 from `192.0.0.0/29`. I updated the examples to use those addresses on the tunnel instead of `/24` addressing and an arbitrary private LAN address on `b4tun0`.
- The kernel module step loaded `ip6table_mangle`, which is unrelated to IPv4 NAT44. I changed it to load `iptable_nat` and `nf_conntrack` alongside `ip6_tunnel`.
- The DHCPv6 AFTR discovery example defined option 64 as free-form text and used quoted values. RFC 6334 defines AFTR-Name as an FQDN, and ISC DHCP documents the built-in option as `option dhcp6.aftr-name domain-name;`. I corrected the example to use the built-in option and valid domain-name syntax.
- The NAT logging snippet tagged logs as `nat64`, which does not match DS-Lite/NAT44. I changed the logger tag to `ds-lite-nat` and limited the `LOG` example to the sample subscriber source prefix.

## Review Notes
- RFC 6333 defines AFTR as a point-to-multipoint function with an extended binding table that includes the subscriber IPv6 address. Plain Linux `ip6tnl` plus `iptables` is suitable for a lab or tightly scoped deployment, but it is not a substitute for purpose-built multi-subscriber AFTR software such as lwAFTR.
- `conntrack` is not installed in this environment, so the `conntrack` commands were checked against the conntrack-tools manual rather than executed locally.
- Live tunnel setup was not executed in this review environment to avoid modifying the host network stack.
