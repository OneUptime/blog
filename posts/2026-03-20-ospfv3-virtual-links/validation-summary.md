# Validation Summary: How to Configure OSPFv3 Virtual Links for IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OSPFv3 (RFC 5340) — IPv6 link-state routing protocol
- OSPF virtual links (RFC 2328 §15, applied to OSPFv3 per RFC 5340)
- Cisco IOS / IOS XE OSPFv3 multi-AF (`router ospfv3` / `address-family ipv6 unicast`)
- FRRouting `ospf6d`
- IPsec authentication (AH/ESP) for OSPFv3 virtual links

## Sources Consulted
- [RFC 5340 — OSPF for IPv6](https://datatracker.ietf.org/doc/html/rfc5340)
- [RFC 2328 — OSPF Version 2 (§15 Virtual Links)](https://datatracker.ietf.org/doc/html/rfc2328#section-15)
- [Cisco IP Routing OSPF Configuration Guide — IPv6 Routing: OSPFv3 Authentication Support with IPsec](https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-ospfv3-auth-ipsec.html)
- [FRRouting `ospf6d` documentation](https://docs.frrouting.org/en/latest/ospf6d.html)
- FRRouting source code (master branch) — `ospf6d/ospf6_top.c`, `ospf6d/ospf6_area.c`, `ospf6d/ospf6_abr.c`, `ospf6d/ospf6_message.c` (verified absence of `virtual-link` `DEFPY`/`DEFUN` definitions; verified presence of "Message may be via Virtual Link: not supported" comment)

## Issues Found

1. **FRRouting does not implement OSPFv3 virtual links.** The original post included an FRRouting configuration block (`router ospf6` / `area 0.0.0.1 virtual-link 2.2.2.2`) and a verification command (`vtysh -c "show ipv6 ospf virtual-link"`). A direct check of the FRR `ospf6d` source on master shows there are **no** `DEFPY`/`DEFUN` command definitions for `virtual-link` in `ospf6_top.c`, `ospf6_area.c`, or `ospf6_abr.c`. The only references to "virtual link" in the daemon are (a) error strings in stub/NSSA conversion code reading "First deconfigure all virtual link through this area" and (b) a comment in `ospf6_message.c` reading "Message may be via Virtual Link: not supported". The FRR documentation page for `ospf6d` likewise has zero mentions of virtual links. The configuration the post showed would therefore fail at the CLI parser, and the show command does not exist. **Fix:** replaced both the FRRouting configuration code block and the FRRouting verification code block with a short note explaining that `ospf6d` does not implement OSPFv3 virtual links and pointing readers at vendor implementations or a topology redesign.

## Review Notes

- The Cisco IOS / IOS XE multi-AF OSPFv3 syntax used in the post (`router ospfv3 N` → `address-family ipv6 unicast` → `area X virtual-link <router-id>`) is current and matches Cisco's IP Routing OSPF Configuration Guide.
- The IPsec authentication command form (`area 1 virtual-link 2.2.2.2 authentication ipsec spi 256 sha1 <key>`) is correct: `spi 256` is the documented minimum SPI value, and SHA-1 is one of the two supported authentication algorithms (alongside MD5). Both algorithms are now considered weak; readers building new deployments should prefer the OSPFv3 Authentication Trailer (RFC 7166) with HMAC-SHA-256 where supported, but that is a hardening recommendation rather than a correctness issue with the post.
- The `show ospfv3 virtual-links` sample output is consistent with what Cisco IOS/IOS XE produces under the multi-AF OSPFv3 process; format details (state `POINT_TO_POINT`, "Run as demand circuit", "DoNotAge LSA not allowed") match real captures.
- The transit-area-must-not-be-stub-or-NSSA constraint is correct per RFC 2328 §15 (carried into OSPFv3 by RFC 5340).
- The troubleshooting block uses Cisco-style `show` commands (`show ospfv3`, `show ospfv3 neighbor`, `show ipv6 route`); these are accurate for Cisco. After the FRR removal, the post is effectively Cisco-only, which the introductory sections still read cleanly with.
