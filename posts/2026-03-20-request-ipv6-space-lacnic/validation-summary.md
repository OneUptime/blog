# Validation Summary: How to Request IPv6 Address Space from LACNIC - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and allocation policy
- LACNIC and MiLACNIC
- WHOIS and RDAP
- RPKI and ROAs
- Reverse DNS delegation
- LACNIC Registration API

## Sources Consulted
- LACNIC Get IP Addresses/ASNs: https://www.lacnic.net/1016/2/lacnic/get-ip-addresses_asns
- LACNIC Membership Fees and Categories: https://www.lacnic.net/2399/2/lacnic/membership-categories-and-fees
- LACNIC ISP IPv6 Fees: https://www.lacnic.net/5450/1/lacnic/isp-ipv6-fees
- LACNIC IPv6 Fees for End-Users: https://www.lacnic.net/5452/1/lacnic/ipv6-fees-for-end-users
- LACNIC IPv6 Address Allocation and Assignment Policies: https://www.lacnic.net/684/2/lacnic/
- LACNIC Whois FAQ: https://www.lacnic.net/1136/2/lacnic/whois-faq
- LACNIC Whois service: https://www.lacnic.net/1040/2/lacnic/whois
- LACNIC Reverse DNS Resolution FAQ: https://www.lacnic.net/1139/2/lacnic/reverse-dns-resolution-faq
- LACNIC Resource Certification (RPKI): https://www.lacnic.net/640/2/lacnic/resource-certification-rpki
- LACNIC Registration API: https://www.lacnic.net/4121/2/lacnic/registration-api
- IANA IPv6 Global Unicast Address Space registry: https://www.iana.org/assignments/ipv6-unicast-address-assignments
- RFC 6177, IPv6 Address Assignment to End Sites: https://www.rfc-editor.org/rfc/rfc6177
- RFC 3194, The Host-Density Ratio for Address Assignment Efficiency: https://www.rfc-editor.org/rfc/rfc3194

## Issues Found
- The fee section used an unofficial four-tier 2024 approximation that does not match LACNIC's actual fee structure. I replaced it with accurate guidance that LACNIC publishes separate fee tables for ISPs and end users and that direct recipients become members after approval, payment, and signature of the Registration Services Agreement.
- The IPv6 policy summary was inaccurate. The original text said an ISP initial `/32` requires no justification in general, that end users get `/48` space via a sponsoring ISP, and that subsequent allocations require `80%` utilization. I corrected this to LACNIC's actual policy: minimum direct ISP allocation `/32`, minimum direct end-user assignment `/48`, larger-than-`/32` ISP requests require documentation, and subsequent allocations are evaluated using the IPv6 HD-ratio threshold of `0.94`.
- The application workflow was oversimplified and partially wrong. I replaced the direct MiLACNIC-only flow and the "usually auto-approved" claim with LACNIC's published request process, including the ISP vs. end-user distinction, the Brazil/Mexico NIR exception, and the documented 48-hour analyst review window.
- The WHOIS example mixed incorrect and non-LACNIC fields, including both `inet6num` and `inetnum` in one record and `nic-hdl-br`, and it implied routing announcements happen through WHOIS or a LACNIC API. I replaced this with a verified `whois -h whois.lacnic.net` query example and clarified that BGP announcements are configured on the operator's routers and upstream sessions.
- The RPKI section contained unverified and non-working `rpki.lacnic.net/api/...` examples. I replaced those with the officially documented MiLACNIC hosted/delegated RPKI guidance and the current LACNIC Registration API v3 ROA endpoints.
- The conclusion overstated that the initial `/32` is available immediately upon membership approval and omitted the Brazil/Mexico NIR handling. I corrected the approval language and regional exception.

## Review Notes
- The post is technically relevant and remains a valid guide after correction.
- Exact MiLACNIC navigation and fee schedules can change over time. Future reviews should re-check the official LACNIC fee pages and request workflow before republication.
