# Validation Summary: How to Use NDP for IPv6 Network Renumbering

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- IPv6 Router Advertisements (RA)
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- `radvd` and `radvdump`
- Linux `ip` and `ss`
- Scapy
- ISC Kea DHCPv6

## Sources Consulted
- RFC 4192, "Procedures for Renumbering an IPv6 Network without a Flag Day" - https://datatracker.ietf.org/doc/html/rfc4192
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8978, "Reaction of IPv6 Stateless Address Autoconfiguration (SLAAC) to Flash-Renumbering Events" - https://datatracker.ietf.org/doc/html/rfc8978
- `radvd.conf(5)` man page - https://www.mankier.com/5/radvd.conf
- `radvdump(8)` man page - https://www.mankier.com/8/radvdump
- Scapy `scapy.layers.inet6` API reference - https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Kea DHCPv6 server documentation, shared networks - https://kea.readthedocs.io/en/kea-2.7.6/arm/dhcp6-srv.html
- Local command help output: `ip -6 addr help`, `ip -6 neigh help`, `ss --help`

## Issues Found
- The post used invalid sample IPv6 prefixes such as `2001:db8:new::/64` and `2001:db8:old::/64`. These were replaced with valid documentation prefixes because IPv6 hextets may only contain hexadecimal characters.
- The description cited RFC 7084 as renumbering guidance. This was corrected to RFC 4192/RFC 4862 because RFC 7084 is about IPv6 CE router requirements, while RFC 4192 and RFC 4862 are the relevant renumbering and address-lifetime references.
- The Phase 3 explanation and Scapy example claimed that an ordinary Router Advertisement with `valid_lifetime=0` would immediately remove the old prefix. This was corrected to reflect RFC 4862's 2-hour rule for existing prefixes learned from unauthenticated RAs.
- The Scapy example also had operational problems: it used an invalid placeholder IPv6 source address, set the router lifetime to zero, and omitted the hop-limit behavior hosts validate for RAs. The snippet was rewritten to use a real link-local source, preserve router lifetime, set hop limit 255, and send a deprecating RA that matches the protocol rules.
- The `radvdump` comment described the tool as dumping sent RAs. It was corrected to describe its actual use: inspecting incoming RAs on a receiving host.
- The Linux inspection examples relied on raw string matching against compressed IPv6 text, which can miss valid addresses. They were updated to use `ip` prefix filters and to scope the NDP monitoring script to recently active neighbors.
- The Kea DHCPv6 example modeled two IPv6 subnets on the same link as plain `subnet6` entries. It was corrected to use a `shared-networks` definition, which is the documented Kea mechanism for multiple logical subnets on one physical link.

## Review Notes
- The post is now accurate for planned IPv6 renumbering using Router Advertisements. Immediate invalidation of stale SLAAC prefixes is intentionally constrained by RFC 4862 unless authenticated Neighbor Discovery is in use.
- The NDP cache monitor is a spot-check of recently active neighbors, not a complete inventory of every host on the link.
- DHCPv6 client migration timing remains implementation-dependent. The Kea example now correctly models same-link coexistence of old and new subnets during a transition, but it should not be read as a guarantee that every client will hold both addresses simultaneously.
