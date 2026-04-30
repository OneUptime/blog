# Validation Summary: How to Plan IPv6 Address Blocks for Data Center Racks

## Status
validated

## Post Type
Technical Guide

## Technologies Covered
- IPv6 addressing and hierarchical subnet allocation
- IP address management (IPAM)
- Python `ipaddress` standard library
- FRRouting (FRR) BGP IPv6 route aggregation

## Sources Consulted
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 5375, IPv6 Unicast Address Assignment Considerations: https://www.rfc-editor.org/rfc/rfc5375.html
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html

## Issues Found
- The original allocation example used several prefixes with host bits set for the stated mask lengths, including the `/40`, rack `/56`, and VLAN `/64` examples. I corrected the sample addresses so every prefix is aligned to the proper network boundary within `2001:db8:100::/40`.
- The IPAM spreadsheet entries did not consistently stay within the rack `/56` shown in the example. I updated the table so the sample VLAN prefixes are valid `/64` subnets inside their corresponding rack blocks.
- The FRR example used `network` plus `no network` as if that would create a summary-only advertisement. I replaced it with `aggregate-address ... summary-only` under `address-family ipv6 unicast`, which is the documented FRR mechanism for suppressing more-specific routes.
- The warning about manually assigning `/128` addresses to servers was too absolute. I revised it to focus on the actual addressing rule that matters here: keep shared rack VLANs at `/64`, and assign addresses within that `/64` via SLAAC, DHCPv6, or static configuration as appropriate.

## Review Notes
- The hierarchy sizes (`/40` for site, `/48` for pod, `/52` for row, `/56` for rack) are design choices rather than protocol requirements, but they are technically valid and consistent with hierarchical IPv6 planning.
- The FRR aggregation example assumes the more-specific rack `/64` routes are already present in the BGP table, such as via redistribution or explicit origination.
