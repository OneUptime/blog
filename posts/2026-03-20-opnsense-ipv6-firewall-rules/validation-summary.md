# Validation Summary: How to Configure IPv6 Firewall Rules on OPNsense - Rules

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OPNsense (firewall distribution built on FreeBSD/HardenedBSD)
- IPv6 networking (DHCPv6, SLAAC, Router Advertisements, ICMPv6/NDP)
- pf (packet filter) firewall rules
- Unbound DNS resolver
- Prefix delegation (PD)

## Sources Consulted
- OPNsense official manual — IPv6 configuration: https://docs.opnsense.org/manual/ipv6.html
- OPNsense official manual — Firewall rules: https://docs.opnsense.org/manual/firewall.html
- OPNsense official manual — Diagnostics (Interfaces): https://docs.opnsense.org/manual/diagnostics_interfaces.html
- OPNsense official manual — Router Advertisements (radvd): https://docs.opnsense.org/manual/radvd.html
- OPNsense official manual — Unbound DNS: https://docs.opnsense.org/manual/unbound.html
- OPNsense how-to — IPv6 over DSL: https://docs.opnsense.org/manual/how-tos/ipv6_dsl.html
- OPNsense source — `services_dhcpv6.php`
- RFC 4861 (IPv6 Neighbor Discovery), RFC 4291 (IPv6 Addressing Architecture)

## Issues Found
1. **Diagnostics path for IPv6 neighbors was wrong** — the post stated `Interfaces → Diagnostics → ARP Table  (shows IPv6 NDP)`. ARP Table is IPv4 only; OPNsense exposes IPv6 neighbor entries through a separate `NDP Table` page. Changed the path to `Interfaces → Diagnostics → NDP Table  (shows IPv6 neighbors)`.
2. **Unbound Host Overrides menu path was incomplete** — `Services → Unbound DNS → Host Overrides` is not a top-level menu item. Host Overrides lives under the Overrides page. Updated to `Services → Unbound DNS → Overrides → Host Overrides`.
3. **Firewall ICMPv6 protocol label** — the OPNsense protocol dropdown uses `IPV6-ICMP` (not generic `ICMP`) when the rule's TCP/IP Version is IPv6, and the type field is labeled `ICMPv6 type`. Updated `Protocol: ICMP` → `Protocol: IPV6-ICMP` and `ICMP type: any` → `ICMPv6 type: any`.
4. **DHCPv6 client field labels were paraphrased** — the post used `Request Prefix Size: /48` and `Send IPv6 Prefix Hint`. The actual UI labels are `Prefix delegation size` (numeric, no leading slash) and `Send IPv6 prefix hint`. Updated both to the correct labels and value form.
5. **Router Advertisement mode names included parenthetical UI suffixes that aren't part of the dropdown** — the post showed `Assisted (RA + DHCPv6)` and `Unmanaged (SLAAC only)` as values. The actual dropdown values are simply `Assisted` and `Unmanaged`. Moved the descriptive text into trailing comments so readers can see what each mode means without confusing it with the literal value.

## Review Notes
- The post conflates "Unmanaged" with "SLAAC only" — Unmanaged in OPNsense means RA without the M/O bits, which is effectively SLAAC, but a stricter SLAAC-only behavior is also possible via the `Stateless` mode (RA only, no other options). The current wording is acceptable shorthand.
- The example WAN static IPv6 address `2001:db8:wan::2 / 64` uses a non-hex segment label (`wan`) inside the address. `2001:db8:` is documentation prefix per RFC 3849, but the colons after `db8` should contain only hex digits in real config. Left as-is because the intent is clearly placeholder/illustrative — readers are expected to substitute real values.
- The DHCPv6 server example assumes ISC-style configuration. OPNsense is in the process of migrating to Kea DHCPv6; the labels `Range from` / `Range to` still apply on both backends, so the snippet remains correct.
- The `Use IPv4 connectivity` checkbox is shown on the WAN interface page in OPNsense and controls whether the IPv4 link must come up before DHCPv6 begins; the description (`unchecked for native IPv6`) is accurate.
- "OPNsense's web interface mirrors pfSense's structure" is broadly true (OPNsense forked from pfSense in 2015) but the menu hierarchy has diverged meaningfully since then; any reader cross-referencing pfSense docs should expect differences, especially around Services and Diagnostics.
