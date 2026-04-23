# Validation Summary: How to Request IPv6 Address Space from AFRINIC - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- AFRINIC resource membership
- IPv6 allocations and PI assignments
- AFRINIC WHOIS database
- RPKI / ROAs
- MyAFRINIC / NMRP
- Reverse DNS

## Sources Consulted
- AFRINIC, "How to become an AFRINIC Resource Member" https://afrinic.net/become-member
- AFRINIC, "Fees & Payment" https://www.afrinic.net/membership/cost
- AFRINIC, "Internet Protocol Version 6 (IPv6)" https://afrinic.net/resources/ipv6
- AFRINIC, "IPv6" support FAQ https://afrinic.net/support/ipv6
- AFRINIC, "Consolidated Policy Manual (v1.5)" https://afrinic.net/cpm-1-5
- AFRINIC, "Membership" https://afrinic.net/afrinic-membership
- AFRINIC, "Resource Management" https://www.afrinic.net/management-2
- AFRINIC, "WHOIS DB - Objects and Attributes" https://afrinic.net/support/whois/objects-and-attributes
- AFRINIC, "RPKI" support FAQ https://afrinic.net/support/rpki
- AFRINIC, "BPKI" support FAQ https://afrinic.net/support/bpki
- IANA, "IPv6 Global Unicast Address Space" https://www.iana.org/assignments/ipv6-unicast-address-assignments
- NLnet Labs, "Routinator API Endpoints" https://routinator.docs.nlnetlabs.nl/en/v0.15.0-rc1/api-endpoints.html

## Issues Found
- The fee schedule was incorrect. The post claimed a low-cost "Micro ISP" tier around $100/year, but AFRINIC's published fee schedule uses a different model, including discounted fees for IPv6-only members and no additional IPv6/ASN fee for existing members. I replaced the fee section with the current published AFRINIC structure.
- The IPv6 policy summary was inaccurate. The post said the first /32 required no additional justification and that end-users obtained /48 space via a sponsoring LIR. AFRINIC policy requires an IPv6 deployment plan and a plan for /48 assignments within 12 months for LIRs, and end-user organisations can receive PI space directly from AFRINIC with a minimum /48. I corrected those statements.
- The application workflow was incorrect. New applicants do not start by requesting resources in MyAFRINIC; AFRINIC directs them to the New Membership Registration Portal and publishes a compliance/evaluation/payment workflow before MyAFRINIC activation. I updated the process accordingly.
- The allocation-source wording was too narrow. The post implied allocations are typically issued from `2c00::/12`, but AFRINIC documents multiple AFRINIC-managed IPv6 pools and member-facing allocation/assignment ranges. I changed the wording to avoid implying a single operational source range.
- The WHOIS `inet6num` example used the wrong IPv6 status and omitted a mandatory template field. AFRINIC documents `ALLOCATED-BY-RIR` for IPv6 LIR resources, and the template includes `changed:` as a mandatory attribute. I corrected the sample object.
- The RPKI navigation and verification command were outdated. AFRINIC's hosted RPKI is under MyAFRINIC `Resources -> Resource Certification`, BPKI is required for access, and the published `rpki.afrinic.net/api/v1/validity` command no longer works. I updated the section to use AFRINIC's Routinator validity endpoint instead.
- The conclusion repeated the incorrect fee claim and the inaccurate direct-allocation summary. I corrected the closing paragraph to reflect the current AFRINIC policy and fee model.

## Review Notes
- The post is technically relevant and contains actionable implementation details, so it was reviewed as a technical guide rather than classified as `not-code-blog`.
- AFRINIC's fee schedule page states that fee structures are subject to Board review, so fee figures in this post may need periodic revalidation even if the policy text remains stable.
