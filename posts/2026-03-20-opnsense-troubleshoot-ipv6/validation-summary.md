# Validation Summary: How to Troubleshoot IPv6 on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OPNsense (23.x+) firewall/router platform
- IPv6 networking (DHCPv6, SLAAC, prefix delegation)
- Router Advertisements (radvd)
- ICMPv6 / NDP (Neighbor Discovery Protocol)
- Unbound DNS resolver
- FreeBSD packet capture
- OneUptime monitoring (mention)

## Sources Consulted
- OPNsense Manual — Interfaces Diagnostics: https://docs.opnsense.org/manual/diagnostics_interfaces.html
- OPNsense Manual — Interfaces configuration: https://docs.opnsense.org/manual/interfaces.html
- OPNsense Manual — IPv6 setup: https://docs.opnsense.org/manual/ipv6.html
- OPNsense Manual — Router Advertisements (radvd): https://docs.opnsense.org/manual/radvd.html
- RFC 8106 — IPv6 Router Advertisement Options for DNS Configuration
- RFC 4861 — Neighbor Discovery for IPv6

## Issues Found
1. **Diagnostics — ARP Table mislabeled as IPv6 NDP source.**
   - Before: `Interfaces → Diagnostics → ARP Table  (shows IPv6 NDP)`
   - After: `Interfaces → Diagnostics → NDP Table  (shows IPv6 neighbors)`
   - Why: The ARP Table view in OPNsense shows IPv4 ARP entries only. IPv6 neighbors learned via NDP are shown in the separate **NDP Table** menu item under Interfaces → Diagnostics. Correcting both the menu path and the descriptive text.

2. **DHCPv6 client field labels did not match the OPNsense GUI.**
   - Before: `Request Prefix Size: /48` and `Send IPv6 Prefix Hint: ✓`
   - After: `Prefix delegation size: /48` and `Send IPv6 prefix hint: ✓`
   - Why: The official OPNsense interface manual documents the field as "Prefix delegation size" (capitalisation matches the GUI). Aligned both labels with the actual web UI.

3. **Router Advertisements DNS toggle mislabeled.**
   - Before: `Advertise DNS: ✓`
   - After: `Enable DNS: ✓`
   - Why: OPNsense's Router Advertisements page exposes an "Enable DNS" toggle (which controls whether RFC 8106 RDNSS/DNSSL options are emitted in RAs). There is no field literally named "Advertise DNS".

## Review Notes
- The Router Advertisements section only mentions two of the five available modes (Disabled, Unmanaged, Managed, Assisted, Stateless). Showing only "Assisted" and "Unmanaged" is reasonable for a quick-start guide and not technically wrong, but a future revision could note the "Managed" and "Stateless" modes too.
- The static IPv6 example uses the documentation prefix `2001:db8::/32` (RFC 3849), which is the correct choice for examples.
- The ICMPv6 firewall rule example is intentionally permissive ("ICMP type: any"). For production hardening, RFC 4890 recommends specific ICMPv6 types to allow rather than blanket-passing all ICMPv6, but for a troubleshooting guide the permissive rule is appropriate.
- The "Use IPv4 connectivity" checkbox on the DHCPv6 client is correctly described — it is used when DHCPv6 must travel over an IPv4-reachable upstream (e.g., tunnel brokers).
- Code-fence language for the Static IPv6 block is `nginx`; this is a stylistic quirk (the content is plain text), but does not affect technical accuracy.
