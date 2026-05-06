# Validation Summary: How to Check If an IPv6 Address Is in a Special-Purpose Range (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and special-purpose ranges
- IANA IPv6 registries
- Python `ipaddress`
- Python `dataclasses`
- Python log parsing with `re` and `collections.Counter`

## Sources Consulted
- IANA, IPv6 Special-Purpose Address Space: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- IANA, IPv6 Address Space: https://www.iana.org/assignments/ipv6-address-space/ipv6-address-space.xhtml
- Python standard library, `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- RFC 8190, *Updates to the Special-Purpose Address Registries*: https://www.rfc-editor.org/rfc/rfc8190
- RFC 4291, *IP Version 6 Addressing Architecture*: https://www.rfc-editor.org/rfc/rfc4291
- RFC 9780, *The Dummy IPv6 Prefix*: https://www.rfc-editor.org/rfc/rfc9780
- RFC 9602, *Segment Routing over IPv6 (SRv6) Prefixes*: https://www.rfc-editor.org/rfc/rfc9602
- RFC 9637, *The 3fff::/20 Documentation Prefix*: https://www.rfc-editor.org/rfc/rfc9637

## Issues Found
- The registry table was not complete for the current IANA IPv6 special-purpose registry. It was missing current entries such as `100:0:0:1::/64`, `2001:1::1/128`, `2001:1::2/128`, `2001:1::3/128`, `2001:4:112::/48`, `2001:10::/28`, `2001:30::/28`, and `2620:4f:8000::/48`. The table was updated to reflect the current registry.
- The table included `::ffff:0:0:0/96` and `ff00::/8` as if they were entries in the IANA IPv6 special-purpose registry. They are not entries in that registry, so the implementation was corrected to keep the hardcoded registry aligned with IANA and to classify multicast separately.
- Several registry properties were wrong. Examples included `::1/128` source/destination flags, `64:ff9b::/96` global reachability, `2001:20::/28` reachability flags, `5f00::/16` global reachability, and other per-prefix booleans. These were corrected to match the IANA registry.
- The original first-match loop could return the less-specific `2001::/32` or `2001::/23` entry before a more-specific allocation in the same space. The code now uses longest-prefix matching so more-specific registry entries win.
- Some registry rows use `N/A` values or represent a terminated allocation. The data model originally forced booleans for every property. It was updated to use optional booleans so `TEREDO`, `6to4`, and deprecated ORCHID can be represented accurately.
- The fallback path labeled any non-matching IPv6 address as `Global Unicast`, which misclassified multicast and reserved space. The fallback logic was corrected to distinguish multicast, global-unicast (`2000::/3`), and reserved IETF space.
- The log-scanning regex was too loose for practical use and did not cleanly handle bracketed IPv6 literals or zone-suffixed tokens before validation. It was replaced with bounded token extraction plus `ipaddress` validation.

## Review Notes
- The classifier is now technically correct as a hardcoded snapshot, but the IANA registry can change over time. Future new allocations will require updating the embedded table.
