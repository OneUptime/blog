# Validation Summary: How to Understand IPv6 Prefix Lengths (/32, /48, /56, /64, /128)

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv6 addressing architecture
- IPv6 prefix lengths and CIDR notation
- SLAAC
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- Python standard library `ipaddress` module

## Sources Consulted
- RFC 4291, *IP Version 6 Addressing Architecture*: https://www.rfc-editor.org/rfc/rfc4291
- RFC 6177, *IPv6 Address Assignment to End Sites*: https://www.rfc-editor.org/rfc/rfc6177.html
- RFC 6164, *Using 127-Bit IPv6 Prefixes on Inter-Router Links*: https://www.rfc-editor.org/rfc/rfc6164
- RFC 7084, *Basic Requirements for IPv6 Customer Edge Routers*: https://www.rfc-editor.org/rfc/rfc7084
- RFC 7381, *Enterprise IPv6 Deployment Guidelines*: https://www.rfc-editor.org/rfc/rfc7381.html
- RFC 7421, *Analysis of the 64-bit Boundary in IPv6 Addressing*: https://www.rfc-editor.org/rfc/rfc7421
- IANA, *IPv6 Global Unicast Address Space*: https://www.iana.org/assignments/ipv6-unicast-address-assignments/ipv6-unicast-address-assignments.xhtml
- RIPE NCC, *Assessment Criteria for IPv6 Allocations*: https://www.ripe.net/manage-ips-and-asns/ipv6/request-ipv6/assessment-criteria-for-ipv6-allocations/
- Python documentation, `ipaddress` module: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The hierarchy diagram claimed fixed `IANA /23` and `RIR /24` allocation sizes. I replaced those labels with generic wording because current IANA and RIR allocations vary and are not fixed at those prefix lengths.
- The `/32` section described `/32` as the minimum RIR allocation for ISPs or large organizations. I changed this to a common provider allocation because current policy is not uniform across RIRs, and `/32` is not a universal present-day minimum.
- The `/48` and `/56` descriptions were phrased too absolutely. I revised them to describe common operational practice rather than a mandatory one-size-fits-all policy, matching RFC 6177 guidance.
- The `/64` section implied `/64` should never be used on point-to-point links. I changed this to note `/127` as a common exception for inter-router point-to-point links, which is the actual recommendation in RFC 6164.
- The `/127` benefits list was made more precise to reflect RFC 6164's motivations: neighbor-cache exhaustion mitigation, avoiding Subnet-Router anycast conflicts, and matching common point-to-point operational practice.
- The `/128` section implied `/128` is a normal way to statically assign addresses to individual servers. I removed that statement because on-link server addressing is normally done within a `/64`; `/128` is more accurately associated with loopbacks, host routes, and anycast service addresses.
- The sample Python output block was updated to match the actual output produced by the code.

## Review Notes
- The Python snippet is syntactically valid and the numeric calculations are correct.
- The article is now accurate as a guide to common IPv6 operational conventions, but RIR allocation policies can still vary by region and change over time.
