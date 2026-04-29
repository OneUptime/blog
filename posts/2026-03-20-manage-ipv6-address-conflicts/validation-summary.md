# Validation Summary: How to Manage IPv6 Address Conflicts

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- IPv6 Duplicate Address Detection (DAD)
- IPv6 Neighbor Discovery Protocol (NDP) and neighbor caches
- Linux `iproute2` / `ip neigh`
- Cisco IOS IPv6 ND debugging
- Python `ipaddress` and `subprocess`
- NetBox IPAM and `pynetbox`

## Sources Consulted
- Post source: `posts/2026-03-20-manage-ipv6-address-conflicts/README.md`
- RFC 4862, "IPv6 Stateless Address Autoconfiguration": https://www.ietf.org/rfc/rfc4862
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://datatracker.ietf.org/doc/html/rfc4861
- RFC 8064, "Recommendation on Stable IPv6 Interface Identifiers": https://www.rfc-editor.org/rfc/rfc8064
- RFC 7217, "A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC)": https://www.rfc-editor.org/rfc/rfc7217
- RFC 8981, "Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6": https://www.rfc-editor.org/rfc/rfc8981
- `ip-neighbour(8)` man page: https://manpages.debian.org/testing/iproute2/ip-neighbour.8.en.html
- Cisco IOS IPv6 Command Reference for `debug ipv6 nd`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_03.html
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- `pynetbox` endpoint documentation: https://pynetbox.readthedocs.io/en/stable/endpoint.html
- Local `ip neigh help` output and local `ip -6 neigh show` output on 2026-04-29 for command/runtime verification

## Issues Found
- The scenario table treated privacy-extension addresses as a real conflict. Updated it to reflect that temporary addresses complicate attribution but are not duplicates by themselves.
- The SLAAC collision row framed collisions as "two interfaces generate the same EUI-64," which is too narrow and dated relative to current IID guidance. Updated it to duplicate interface identifiers, including cloned MAC/EUI-64 and manually reused IIDs.
- The Linux DAD/NDP section used an overly brittle `dmesg` grep and a Cisco example string that did not match documented `debug ipv6 nd` output. Adjusted the grep patterns and replaced the Cisco example with documented duplicate-address messages.
- The Step 2 parser did not match real `ip -6 neigh show` output when flags such as `router` are present, and the detection logic incorrectly assumed a single NDP snapshot can show multiple MACs for one address. Replaced it with token-based parsing of `ip -6 neigh show nud all` and repeated-sampling MAC-flap detection.
- The Step 3 reconciliation script overclaimed what NDP can prove and labeled all NDP-only addresses as shadow IT. Added the required local-link caveat, changed the messaging to heuristic wording, and changed the output to investigation-oriented phrasing.
- The Step 3 NetBox query relied on filter behavior that can silently broaden results if filters are wrong. Added `strict_filters=True` and filtered the target prefix locally with Python's `ipaddress`.
- The Step 4 IPAM existence check used `filter(address=address)` as a truth test and implied the address was safe if absent from the local NDP cache. Reworked it to compare normalized host addresses against active NetBox data and changed the function description to a best-effort local-link reservation check.
- The scenario table said "same /128" for duplicate static assignment, which is narrower than the actual duplicate condition. Updated it to "the same IPv6 address."

## Review Notes
- NDP only reveals neighbors on the local link. Even on a first-hop router, a missing NDP entry does not prove an address is unused; the device may be silent, offline, or on a different segment.
- RFC 4862 explicitly notes that DAD is not completely reliable, so operational monitoring and IPAM workflow controls remain necessary even when DAD is enabled.
- The Step 3 and Step 4 snippets now explicitly depend on the Step 2 `get_ndp_table()` helper and assume Linux with `iproute2` plus a reachable NetBox instance.
