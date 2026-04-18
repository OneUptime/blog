# Validation Summary: How to Configure IPv6 in VMware NSX

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- VMware NSX-T (NSX 3.x+) software-defined networking
- NSX-T Segments (overlay networks)
- NSX-T Tier-0 and Tier-1 Gateways
- BGP with IPv6 address-family (multiprotocol BGP)
- DHCPv6 and SLAAC address assignment
- NSX Distributed Firewall (IPv6 rules, ICMPv6)
- NAT64 (RFC 6146) with well-known prefix 64:ff9b::/96 (RFC 6052)
- NSX-T Policy REST API (Python `requests` SDK)
- NSX Edge CLI (get logical-router commands)

## Sources Consulted
- VMware NSX-T Data Center Administration Guide — IPv6 in NSX-T (docs.vmware.com)
- VMware NSX Policy API Reference — Segments resource (PUT /policy/api/v1/infra/segments/{segment-id})
- VMware NSX-T CLI Reference — `get logical-router` commands
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators (well-known prefix 64:ff9b::/96)
- RFC 6146 — Stateful NAT64
- RFC 4443 — ICMPv6 specification (why ICMPv6 must be permitted for NDP/PMTUD)
- RFC 3849 — IPv6 documentation prefix 2001:db8::/32
- VMware NSX-T NAT64 configuration guide on Tier-1 Gateways

## Issues Found
- **REST API HTTP method**: The Python example used `requests.post()` to create a segment at `/policy/api/v1/infra/segments/{name}`. The NSX-T Policy API is declarative — a resource with a caller-specified ID is created/updated with `PUT`, not `POST`. Changed `requests.post` to `requests.put` so the snippet matches the documented API contract and would actually succeed against a real NSX Manager.

## Review Notes
- Dual-stack IPv4/IPv6 support on Segments, Tier-0/Tier-1 gateways, DHCPv6, distributed firewall, and NAT64 is accurate for NSX-T 3.x and NSX 4.x.
- The well-known NAT64 prefix `64:ff9b::/96` is correct per RFC 6052.
- The 2001:db8::/32 documentation prefix (RFC 3849) is used throughout — appropriate for a tutorial.
- The "DHCP Address and SLAAC" RA Mode label may appear as "SLAAC and DHCPv6" or similar in some NSX-T versions; the exact UI wording varies slightly between 3.0, 3.1, 3.2 and 4.x releases, but the underlying behavior described is correct.
- The NSX Edge CLI commands (`get logical-router <uuid> route ipv6`, `get logical-router <uuid> bgp neighbor`) are valid NSX-T Edge CLI syntax.
- `ping6` is still present on most Linux distributions; modern `iputils` also supports `ping -6` or just `ping` on dual-stack systems — either would work.
- The claim that ICMPv6 must be explicitly permitted when the distributed firewall default is deny-all is accurate — NDP, RA/RS, and PMTUD all depend on ICMPv6.
- The `nginx` code-block language hint on the Tier-0 BGP section is cosmetically odd (the content is plain text, not nginx config), but it does not affect technical correctness and was left as-is per the "fix only technical errors" rule.
