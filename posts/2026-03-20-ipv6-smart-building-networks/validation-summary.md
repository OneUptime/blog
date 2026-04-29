# Validation Summary: How to Plan IPv6 Addressing for Smart Building Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnet planning
- SLAAC and DHCPv6
- ISC Kea DHCPv6
- DNS AAAA records
- Linux `ip6tables`
- NetBox IPAM API

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 7217, A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC): https://datatracker.ietf.org/doc/html/rfc7217
- ISC Kea DHCPv6 Administrator Reference Manual: https://kea.readthedocs.io/en/kea-2.5.5/arm/dhcp6-srv.html
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox API & Integration overview: https://netbox.readthedocs.io/en/feature/features/api-integration/
- `ip6tables(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html

## Issues Found
- The reserved IPv6 block was shown as `2001:db8:a:100::/56 - 2001:db8:a:1ff::/56`. The second value is not a valid `/56` network boundary. I changed this to `2001:db8:a:100::/56`.
- The HVAC addressing example implied that SLAAC devices would be confined to the `::1000-ffff` range. SLAAC forms addresses from the advertised prefix plus an interface identifier and is not constrained to a manually defined low range in that way. I changed the text to `static/DHCPv6`.
- The Kea DHCPv6 example used invalid IPv6 literals: `2001:db8:a:1::hvac-ctrl-1` and `2001:db8:bms::53`. IPv6 addresses may only contain hexadecimal digits in each hextet. I replaced them with valid addresses: `2001:db8:a:1::10` and `2001:db8:a:7::53`.

## Review Notes
- The shell example is syntactically valid under Bash.
- The `ip6tables` commands use valid CLI syntax; on modern Linux systems they commonly run through the nftables backend.
- NetBox v4.5 documentation strongly encourages v2 API tokens with `Authorization: Bearer ...`; the post's `Authorization: Token ...` example is still valid for legacy v1 tokens, so it was left unchanged.
- The firewall snippet is illustrative rather than a complete policy and assumes any broader stateful forwarding rules are handled elsewhere.
