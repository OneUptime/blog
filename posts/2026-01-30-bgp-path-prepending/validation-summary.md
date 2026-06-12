# Validation Summary: How to Create BGP Path Prepending

## Status
validated

## Post Type
Technical guide / networking tutorial

## Technologies Covered
- BGP and AS path prepending
- Cisco IOS/IOS-XE route maps and BGP policy
- Juniper Junos routing policy
- FRRouting
- BIRD 2.x
- Ansible and Jinja2 templates
- RIPEstat Looking Glass API
- Python, requests, and PySNMP
- SNMP interface counter monitoring

## Sources Consulted
- RFC 4271: A Border Gateway Protocol 4 (BGP-4): https://datatracker.ietf.org/doc/html/rfc4271
- Cisco: Select BGP Best-path Algorithm: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13753-25.html
- Cisco IOS XE 17.x IP Routing Configuration Guide, route-map continue / AS path prepend behavior: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-route-map-continue.html
- Juniper: Example Configuring a Routing Policy for AS Path Prepending: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/example/routing-policy-security-routing-policy-to-prepend-to-as-path-configuring.html
- Juniper: show route advertising-protocol command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-advertising-protocol.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting route-map documentation: https://docs.frrouting.org/en/latest/routemap.html
- BIRD 2.16 User's Guide: https://bird.nic.cz/doc/bird-2.16.2.html
- RIPEstat Looking Glass API documentation: https://stat.ripe.net/docs/data-api/api-endpoints/looking-glass
- Ansible filter documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Jinja template documentation: https://jinja.palletsprojects.com/en/stable/templates/
- PySNMP 7.1 API reference: https://docs.lextudio.com/pysnmp/v7.1/docs/api-reference.html
- PySNMP 7.1 GET operation documentation: https://docs.lextudio.com/pysnmp/v7.1/docs/hlapi/v1arch/asyncio/manager/cmdgen/getcmd

## Issues Found
- The BGP path-selection explanation presented Cisco-specific ordering as generic BGP behavior. Updated the wording to state that the shown order is Cisco's commonly documented best-path order.
- The Cisco basic route-map example only had a matching permit sequence, which would implicitly deny non-matching outbound routes if the route-map were used beyond the listed prefixes. Added an empty permit sequence to preserve non-matching routes.
- The Cisco AS-path length explanation incorrectly mixed the receiving ISP's view with the remote AS view. Clarified that ISP B receives the local AS repeated four times and that remote ASes typically see ISP B's AS prepended in front of that path.
- The Junos "with Count" subsection implied a count-style syntax even though the example uses a repeated AS string. Renamed and reworded the subsection to match Junos syntax.
- The Ansible example used a non-standard `repeat` filter. Replaced it with Jinja list multiplication and honored per-neighbor `prepend_count`.
- The RIPEstat script did not check HTTP errors and assumed `as_path` was always a string. Added `raise_for_status()` and made the AS-path parsing tolerant of string or list responses.
- The PySNMP example used the old synchronous `pysnmp.hlapi` `getCmd` API, which is removed in current PySNMP 7.x. Updated the example to use the current asyncio `get_cmd` API and `UdpTransportTarget.create()`.
- The FRRouting diagnostic summary used legacy `show ip bgp` forms. Updated the FRR examples to current `show bgp ipv4 unicast ...` forms.
- The upstream community example used `set community` without `additive`, which can overwrite existing communities. Added `additive`.

## Review Notes
The post is technically relevant and implementation-focused. Some operational outcomes, such as traffic percentages from prepending and convergence timing, are necessarily approximate because they depend on upstream and remote-network policy.
