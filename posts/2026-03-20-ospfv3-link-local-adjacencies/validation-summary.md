# Validation Summary: How to Understand OSPFv3 Link-Local Address Adjacencies

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OSPFv3 (RFC 5340)
- IPv6 link-local addressing (RFC 4291)
- IPv6 multicast (ff02::5 AllSPFRouters, ff02::6 AllDRouters)
- FRRouting (ospf6d / vtysh)
- Linux iproute2 (`ip -6 addr`, `ip -6 route`, `ip -6 maddr`)
- tcpdump
- ip6tables / nftables

## Sources Consulted
- RFC 5340 - OSPF for IPv6: https://datatracker.ietf.org/doc/html/rfc5340
- RFC 4291 - IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- FRRouting ospf6d documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- iproute2 rt_protos: /etc/iproute2/rt_protos (entry `188 ospf`)
- tcpdump pcap-filter(7) man page
- nftables wiki on protocol matching with `nexthdr` / `meta l4proto`
- IANA Protocol Numbers (OSPF = 89)

## Issues Found
1. **FRR command for OSPFv3 neighbors** — The post used `vtysh -c "show ipv6 ospf neighbor"`. In FRRouting, the OSPFv3 daemon is `ospf6d` and the canonical command is `show ipv6 ospf6 neighbor`. Updated to use the correct `ospf6` form.
2. **nftables protocol name** — The nftables example used `ip6 nexthdr ospf`. The `nexthdr` matcher in nftables does not reliably accept "ospf" as a name across distributions (it depends on /etc/protocols entries and the nftables-internal name table). Replaced with the portable numeric form `ip6 nexthdr 89`.

## Review Notes
- All multicast address claims (ff02::5, ff02::6), the link-local prefix (fe80::/10), and IP protocol 89 are correct per RFC 5340 / RFC 4291 / IANA.
- `ip -6 route show proto ospf` works on standard Linux distributions because `/etc/iproute2/rt_protos` maps the name `ospf` to protocol id 188, which is what FRR's zebra uses when installing OSPFv3 routes.
- The simplified `show ipv6 ospf6 neighbor` output shown in the post omits the `Pri` and `Duration` columns that FRR actually prints; the example is illustrative rather than literal, but this is acceptable for the teaching point (showing that the Address column contains a link-local).
- The static link-local replacement snippet (`ip -6 addr del ... ; ip -6 addr add fe80::1/64 ...`) is correct, but readers should be aware that this temporarily breaks any existing OSPFv3 adjacency on that interface and that the awk extraction assumes a single link-local address is present.
- The nftables snippet shows only the rule line; a full standalone ruleset would also need `type filter hook input priority filter; policy ...;` inside the chain. The post presents it as an "equivalent" excerpt, which is fine.
