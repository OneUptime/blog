# Validation Summary: How to Understand IPv6 IP Address Management (IPAM)

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv6 addressing and prefix hierarchy (/32, /48, /64)
- RIR allocation policies (ARIN, RIPE)
- Python `ipaddress` standard library
- NetBox IPAM (via pynetbox)
- SLAAC / DHCPv6 (mentioned)

## Sources Consulted
- RFC 4291 "IP Version 6 Addressing Architecture" — /64 interface ID boundary
- RFC 6177 "IPv6 Address Assignment to End Sites" — /48 per end site guidance
- RFC 7421 "Analysis of the 64-bit Boundary in IPv6 Addressing"
- Python `ipaddress` module documentation (https://docs.python.org/3/library/ipaddress.html) — `ip_network`, `subnets(new_prefix=...)`
- pynetbox documentation (https://github.com/netbox-community/pynetbox) — `available_prefixes` DetailEndpoint
- NetBox API docs — prefix filters, available-prefixes sub-endpoint

## Issues Found
1. **NetBox "available prefixes" query was incorrect.** The snippet used `nb.ipam.prefixes.filter(parent="2001:db8::/32", available=True)`, which is not a valid NetBox API pattern — NetBox does not validate unknown filter keys and would return the full prefix table. Replaced with the canonical pattern using the `available_prefixes` DetailEndpoint on the parent object: `parent.available_prefixes.list()`.
2. **Site field in `create()` used a dict lookup by name.** Changed `"site": {"name": "headquarters"}` to `"site": "headquarters"` (slug form), which is the documented/reliable approach for foreign key writes. Name-based dict lookups are not guaranteed by NetBox's writable API.

## Review Notes
- The Python address-plan math is correct: for a `/32` organization, `2 ** (64 - 32) = 4,294,967,296` available `/64` subnets; and `2001:db8:{site}:{vlan}::/64` carves the space so each site effectively has a `/48` worth of VLANs.
- The `org_parts = org_prefix.replace("/32", "").rstrip(":")` trick works only for prefixes written as `"2001:db8::/32"` — it is hardcoded to `/32` and not robust to other org prefix lengths. Functional for the example, but brittle if readers adapt it.
- The mermaid hierarchy uses `/50` as an intermediate block size, which is valid but unusual; `/52` or `/56` are more conventional in published IPv6 address plans. Left as author's choice — not technically wrong.
- `tags: [{"name": "ipv6"}]` is accepted by current NetBox versions (3.x/4.x) as the object-form for tags; kept as-is.
- `"2001:db8::/32"` is in the documentation prefix range (RFC 3849), appropriate for examples.
