# Validation Summary: How to Design IPv4 Addressing for SD-WAN Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing and CIDR summarization
- SD-WAN network design
- Cisco SD-WAN / Viptela `vEdge` configuration
- Python `ipaddress` module

## Sources Consulted
- RFC 1918, *Address Allocation for Private Internets* — https://www.rfc-editor.org/rfc/rfc1918.html
- RFC 5737, *IPv4 Address Blocks Reserved for Documentation* — https://www.rfc-editor.org/rfc/rfc5737
- RFC 4632, *Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan* — https://www.rfc-editor.org/rfc/rfc4632
- Python Standard Library: `ipaddress` — https://docs.python.org/3/library/ipaddress.html
- Cisco Catalyst SD-WAN Systems and Interfaces Configuration Guide, VPN — https://www.cisco.com/c/en/us/td/docs/routers/sdwan/17-x/systems-interfaces/systems-interfaces-guide-17-x/vpn.html
- Cisco SD-WAN Systems and Interfaces Configuration Guide for `vEdge`, Configure Network Interfaces — https://www.cisco.com/c/en/us/td/docs/routers/sdwan/configuration/system-interface/vedge-20-x/systems-interfaces-book/configure-interfaces.html
- Cisco Catalyst SD-WAN Command Reference (`ip route`) — https://www.cisco.com/c/en/us/td/docs/routers/sdwan/command/sdwan-cr-book/config-cmd.html
- Cisco Catalyst SD-WAN Getting Started Guide / system overview — https://www.cisco.com/c/en/us/td/docs/routers/sdwan/26x-later/getting-started/sdwan-getting-started-guide/system-overview.html

## Issues Found
- The post claimed site IDs could range from `001–999`, but the addressing formula `10.<site_id>.<vlan>.0/24` places the site ID in a single IPv4 octet. In this design, `253–255` were already reserved by the management, loopback/system, and optional overlay ranges, so the valid site range was corrected to `001–252`.
- The wording implied a separate numbered overlay-tunnel subnet is always required. That is not universally true for SD-WAN platforms such as Cisco SD-WAN, where overlay identity is centered on system IPs and TLOCs. I updated the description, introduction, table entry, and checklist to make the `10.255.0.0/16` tunnel range explicitly optional.
- The Cisco `vEdge` WAN snippet was incomplete. Cisco documentation requires the WAN transport interface to be enabled with `no shutdown`, and `vEdge` tunnel interfaces require an explicit encapsulation type. I added `no shutdown`, `encapsulation ipsec`, and the missing VPN 0 default route to the WAN next hop.
- The regional summary `10.1.0.0/20` for Sites `001–015` was mathematically incorrect. I replaced it with the exact set of CIDR summaries that actually cover Sites `001–015`, and tightened the conclusion to describe per-site summarization accurately.

## Review Notes
- The post’s use of `203.0.113.0/30` is appropriate for documentation examples because `203.0.113.0/24` is TEST-NET-3 under RFC 5737, but it should not be used as a production WAN allocation.
- The Python example is syntactically correct and was locally re-checked against Python 3.12’s `ipaddress` module for the sample site and VLAN values shown in the post.
- In Cisco SD-WAN, `ip route 0.0.0.0/0 vpn 0` is valid for sending service-VPN traffic toward the transport VPN. For direct internet access, Cisco documents pair this pattern with NAT on the VPN 0 transport interface; the post does not go into DIA/NAT specifics.
