# Validation Summary: How to Understand RIPE IPv6 Deployment Requirements

## Status
validated

## Post Type
Guide

## Technologies Covered
- RIPE NCC IPv6 allocation and assignment policy
- IPv6 addressing and subnet planning
- RIPE Database inet6num and route6 objects
- WHOIS queries for RIPE Database records
- Reverse DNS and ip6.arpa delegation
- BIND reverse DNS zone configuration
- BGP, IRR route objects, RPKI, and ROAs

## Sources Consulted
- RIPE NCC IPv6 Address Allocation and Assignment Policy (RIPE-738): https://www.ripe.net/publications/docs/ipv6-policy
- RIPE NCC Obtain and Register IPv6: https://www.ripe.net/publications/ipv6-info-centre/deployment-planning/obtain-and-register-ipv6/
- RIPE NCC Charging Scheme 2026 (RIPE-848): https://www.ripe.net/publications/docs/ripe-848/
- RIPE NCC Service Region: https://www.ripe.net/about-us/what-we-do/ripe-ncc-service-region/
- RIPE Database RPSL object documentation: https://docs.db.ripe.net/RPSL-Object-Types/Descriptions-of-Primary-Objects
- RIPE Database query type documentation: https://docs.db.ripe.net/Tables-of-Query-Types-Supported-by-the-RIPE-Database
- RIPE Database IRRToolset support documentation: https://docs.db.ripe.net/Types-of-Queries/IRR-Toolset-Support
- RIPE NCC Reverse Delegation: https://www.ripe.net/manage-ips-and-asns/dns/reverse-dns/
- RIPE Database reverse DNS configuration documentation: https://docs.db.ripe.net/Database-Support/Configuring-Reverse-DNS
- RIPE NCC RPKI documentation: https://www.ripe.net/manage-ips-and-asns/resource-management/rpki/
- RIPE NCC Hosted Certification Authority and ROA documentation: https://www.ripe.net/manage-ips-and-asns/resource-management/rpki/resource-certification-roa-management/
- IANA IPv6 Global Unicast Address Space registry: https://www.iana.org/assignments/ipv6-unicast-address-assignments
- RFC 6164, Using 127-Bit IPv6 Prefixes on Inter-Router Links: https://www.rfc-editor.org/rfc/rfc6164.html
- RFC 5398, Autonomous System Number Reservation for Documentation Use: https://datatracker.ietf.org/doc/html/rfc5398

## Issues Found
- The post referenced `ripe-733` for IPv6 policy. Updated it to the current RIPE-738 IPv6 Address Allocation and Assignment Policy.
- One IANA-to-RIPE NCC IPv6 allocation example used `2001:1400::/23`. Updated it to the current IANA registry entry, `2001:1400::/22`.
- The membership fee range was outdated and implied category-based pricing. Updated the 2026 fee to EUR 1,800 per LIR account and added the EUR 1,000 sign-up fee.
- The allocation-size guidance omitted that LIRs can request up to a /29 without additional documentation. Added that detail and clarified that larger allocations require documented justification.
- The RIPE Database section incorrectly implied that LIRs create their own top-level allocation object. Changed it to state that RIPE NCC registers the top-level allocation and LIRs create assignment or sub-allocation objects under it.
- The inet6num example lacked a `status:` attribute and used a top-level allocation as if it were customer-created. Changed it to an `ASSIGNED` /48 customer/site assignment example.
- The route6 example used private AS64500. Changed it to documentation AS64496 and added text reminding readers to replace example values with real routing data.
- The address-planning guidance said to use /64 for all subnets and "never smaller". Added the /127 inter-router point-to-point exception from RFC 6164.
- The routing and compliance text treated route6 objects as mandatory for all advertised prefixes. Changed this to routing-policy guidance tied to IRR/RPKI filtering.
- The reverse DNS section incorrectly said RIPE NCC auto-delegates allocations and that users should contact RIPE NCC for ip6.arpa delegation. Corrected this to use RIPE Database domain objects after configuring authoritative name servers.
- The reverse DNS BIND example claimed to show a /48 but used the /32 reverse zone name. Updated the zone name and file path to the correct /48 nibble-reversed ip6.arpa name.
- The route6 WHOIS command used unsupported `route6=prefix` syntax. Updated it to an exact route6 query using RIPE Database query flags.
- The RPKI note pointed to `https://my.ripe.net/` and only mentioned members. Updated it to the RPKI dashboard and included eligible PI or legacy resource holders.

## Review Notes
The local environment does not have the `whois` client installed, so WHOIS command behavior was checked against RIPE Database query documentation rather than local execution. The example `2001:db8::/32` prefix and AS64496 are documentation placeholders and must be replaced with real resources before use.
