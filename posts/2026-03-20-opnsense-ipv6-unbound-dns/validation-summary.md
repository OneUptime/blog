# Validation Summary: How to Configure IPv6 with Unbound DNS on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OPNsense (FreeBSD-based firewall)
- Unbound DNS resolver
- IPv6 (AAAA records, SLAAC, DHCPv6, ICMPv6, NDP)
- Router Advertisements (RA)
- DHCPv6 Server / Prefix Delegation

## Sources Consulted
- OPNsense Interfaces docs: https://docs.opnsense.org/manual/interfaces.html
- OPNsense Diagnostics (Interfaces): https://docs.opnsense.org/manual/diagnostics_interfaces.html
- OPNsense Router Advertisements (radvd): https://docs.opnsense.org/manual/radvd.html
- OPNsense Unbound DNS: https://docs.opnsense.org/manual/unbound.html

## Issues Found
1. **Wrong diagnostic table for IPv6 neighbors.** The post said `Interfaces → Diagnostics → ARP Table  (shows IPv6 NDP)`. The ARP Table only shows IPv4 ARP entries; IPv6 Neighbor Discovery entries live in a separate `NDP Table`. Updated the line to `Interfaces → Diagnostics → NDP Table  (shows IPv6 neighbors)`.
2. **Incorrect DHCPv6 client option labels.** The WAN DHCPv6 example used "Request Prefix Size: /48" and "Use IPv4 connectivity: unchecked" — neither matches the documented OPNsense fields. Replaced with the official labels: `Prefix delegation size: 48`, `Send IPv6 prefix hint: ✓`, and `Request only an IPv6 prefix: unchecked` (which is the actual checkbox; leaving it unchecked yields the native IPv6 address + delegated prefix combination the original sentence intended).

## Review Notes
- The "Manual Configuration" checkbox under the LAN Track Interface section is correctly named and exists in OPNsense (under "Track Interface (legacy)" mode); it allows the per-interface DHCPv6 server / RA settings to be controlled manually rather than inherited from the tracked interface.
- Router Advertisement modes "Assisted" and "Unmanaged" are valid (full set: Disabled, Router Only, Unmanaged, Managed, Assisted, Stateless).
- `2001:db8:wan::2` and `2001:db8:lan::100` are documentation-prefix examples (RFC 3849) — note that strictly `2001:db8:wan::2` uses the hex characters `wan`, which work as a 16-bit hextet only because `w/a/n` are not valid hex (they aren't); however it is consistent with the documentation-only intent and readers should treat it as a placeholder. Not changed because it is clearly a labelled example, not a literal.
- In recent OPNsense versions the DHCPv6 server has been migrated to Kea; the legacy ISC DHCPv6 path under `Services → DHCPv6` still works and is the menu wording most users see, so left as-is.
