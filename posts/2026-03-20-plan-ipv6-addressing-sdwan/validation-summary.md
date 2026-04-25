# Validation Summary: How to Plan IPv6 Addressing for SD-WAN

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnet planning
- SD-WAN overlay and controller addressing
- BGP route summarization
- Python `ipaddress` address-planning automation

## Sources Consulted
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/rfc4291/
- RFC 5375, IPv6 Unicast Address Assignment Considerations: https://datatracker.ietf.org/doc/html/rfc5375
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- Python Standard Library, `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- Cisco IOS XE Catalyst SD-WAN Qualified Command Reference, BGP Commands: https://www.cisco.com/c/en/us/td/docs/routers/sdwan/command/iosxe/qualified-cli-command-reference-guide/m-bgp-commands.html
- Routing Configuration Guide, Cisco IOS XE Catalyst SD-WAN Release 17.x: https://www.cisco.com/c/en/us/td/docs/routers/sdwan/configuration/routing/ios-xe-17/routing-configuration-guide-17-x.html

## Issues Found
- The original examples used `2001:db8:company::/48`, which is not a valid IPv6 literal. I replaced it with `2001:db8:1000::/48`, which stays inside the RFC 3849 documentation prefix and is syntactically valid.
- The original `/48 -> /52 -> /56 -> /64` hierarchy did not match the stated scalability or the later encoding examples. I corrected the plan to `/48 -> /52 -> /60 -> /64`, which cleanly fits 4 bits of region, 8 bits of site ID, and 4 bits of VLAN/subnet ID inside the fourth hextet.
- The address encoding section incorrectly varied hextets that would be fixed inside a `/48`. I rewrote the examples so the region, site, and VLAN values are encoded consistently in the fourth hextet only.
- The Python sample would not run as written because the base prefix was invalid and it attempted `list(vlan_prefix.hosts())` on an IPv6 `/64`, which is not practical. I replaced the invalid prefix, removed the unused import, updated the hierarchy to `/52` and `/60`, and used numeric offset arithmetic from the subnet base for example addresses.
- The SD-WAN controller labels were inaccurate. I corrected them to `vManage`, `vBond Orchestrator`, and `vSmart Controller`.
- The loopback examples were shown as `/80` prefixes even though each line described a single loopback endpoint. I changed them to `/128` host addresses.
- The BGP summarization section used `/50` summaries that were not aligned with the illustrated `/52` regional allocations. I corrected the summaries to aligned `/52` prefixes and replaced the vendor-specific CLI line with implementation guidance because Cisco IPv6 aggregate syntax varies by platform and software train.

## Review Notes
- The revised plan intentionally uses `/60` site allocations so a single `/48` can encode region, site, and subnet information without breaking `/64` LAN boundaries. If a site needs more than 16 `/64` segments, reserve multiple adjacent `/60` blocks or assign a larger per-site prefix.
- All example addresses use the RFC 3849 documentation prefix, so they are suitable for documentation but not for production routing.
