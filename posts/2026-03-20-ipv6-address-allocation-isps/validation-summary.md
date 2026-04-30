# Validation Summary: How to Plan IPv6 Address Allocation for ISPs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and prefix planning
- RIR/LIR allocation policy
- DHCPv6 Prefix Delegation with Kea
- BGP route origination and aggregation
- NetBox IPAM and `pynetbox` automation

## Sources Consulted
- RFC 6177, "IPv6 Address Assignment to End Sites": https://www.rfc-editor.org/rfc/rfc6177.html
- RFC 6164, "Using 127-Bit IPv6 Prefixes on Inter-Router Links": https://www.rfc-editor.org/rfc/rfc6164
- RFC 8678, "Enterprise Multihoming Using Provider-Assigned IPv6 Addresses without Network Prefix Translation": https://www.rfc-editor.org/rfc/rfc8678.html
- RFC 9099, "Operational Security Considerations for IPv6 Networks": https://www.rfc-editor.org/rfc/rfc9099.html
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation": https://www.rfc-editor.org/rfc/rfc3849.html
- RIPE, "IPv6 Address Allocation and Assignment Policy" (`ripe-738`): https://www.ripe.net/media/documents/ripe-738.pdf
- RIPE, "Obtain and Register IPv6": https://www.ripe.net/publications/ipv6-info-centre/deployment-planning/obtain-and-register-ipv6/
- FRRouting BGP documentation: https://docs.frrouting.org/en/stable-10.2/bgp.html
- Kea DHCPv6 server documentation: https://kea.readthedocs.io/en/kea-2.7.7/arm/dhcp6-srv.html
- Kea configuration grammar: https://kea.readthedocs.io/en/latest/grammar/grammar.html
- NetBox REST API documentation: https://netbox.readthedocs.io/en/feature/integrations/rest-api/
- NetBox prefix model documentation: https://netbox.readthedocs.io/en/feature/models/ipam/prefix/
- `pynetbox` endpoint documentation: https://pynetbox.readthedocs.io/en/stable/endpoint.html

## Issues Found
- The post said a `/32` is the standard ISP allocation. I changed this to say many ISPs begin with a `/32`, but the actual initial allocation depends on RIR policy and documented need. RIPE policy, for example, allows initial allocations from `/32` up to `/29` without additional documentation.
- The RFC 6177 section incorrectly presented fixed customer prefix sizes as RFC recommendations. I changed the wording to reflect what RFC 6177 actually says: end sites should receive at least a `/64` and usually significantly more, while the table remains an example of common ISP practice rather than a normative standard.
- The Kea DHCPv6-PD snippet omitted an explicit subnet `id`, which current Kea documentation recommends and newer releases warn about when absent. I added `"id": 1` and kept the example aligned with documented `pd-pools` syntax.
- The Kea snippet was fenced as `json` but included a shell-style comment, which made it invalid JSON. I removed the comment so the example is syntactically correct JSON.
- The BGP example used an imprecise IPv6 address-family stanza and mixed generic advice with a platform-specific aggregate command. I replaced it with a concrete FRRouting-valid example using `address-family ipv6 unicast` and originating only the ISP aggregate.
- The `pynetbox` example used `prefix_length=48` as a filter argument. `pynetbox` accepts endpoint-supported filters only and can silently ignore incorrect filter keywords, so I changed the example to use a documented filter (`status="active"`) and perform the `/48`, IPv6, and role checks in Python.
- The multihoming section incorrectly implied that a customer can receive a portable `/48` from the ISP's own block. I corrected this to explain that customers who need provider portability generally need PI space rather than the ISP's provider-assigned block.
- The conclusion referred to "RIR recommendations for customer prefix sizes," which overstated the role of RIR policy in end-site delegation sizing. I changed it to refer to RIR allocation policy plus the ISP's own customer prefix policy.

## Review Notes
- The examples use `2001:db8::/32`, which is a documentation prefix and appropriate for published examples.
- The customer-size table is now clearly framed as operational practice. Exact prefix sizes remain a local policy decision based on customer requirements and the provider's allocation policy.
