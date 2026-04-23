# Validation Summary: How to Request IPv6 Address Space from ARIN - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and allocation
- ARIN policy and request workflow
- ARIN Online
- RPKI / ROAs
- ARIN Reg-RWS API
- ARIN Whois / RDAP
- Reverse DNS
- Bash

## Sources Consulted
- ARIN Number Resource Policy Manual (NRPM): https://www.arin.net/participate/policy/nrpm/
- ARIN Requesting IP Addresses or ASNs: https://www.arin.net/resources/guide/request/
- ARIN Membership: https://www.arin.net/participate/oversight/membership/
- ARIN Membership FAQ: https://www.arin.net/participate/oversight/membership/faq/
- ARIN Fee Schedule (effective 1 January 2026): https://www.arin.net/resources/fees/fee_schedule/
- ARIN Route Origin Authorizations (ROAs): https://www.arin.net/resources/manage/rpki/roas/
- ARIN Hosted RPKI: https://www.arin.net/resources/manage/rpki/options/hosted/
- ARIN RPKI RESTful API User Guide: https://www.arin.net/resources/manage/rpki/rpki-restful/
- ARIN RPKI Best Practices and Troubleshooting: https://www.arin.net/resources/manage/rpki/help/bestpractices/
- ARIN Reverse DNS: https://www.arin.net/resources/manage/reverse/
- ARIN Securing DNS (DNSSEC): https://www.arin.net/resources/manage/dnssec/
- ARIN Searching Whois Using a CLI: https://www.arin.net/resources/registry/whois/rws/cli/
- ARIN Using Whois: https://www.arin.net/resources/registry/whois/
- ARIN Registry Data Description: https://www.arin.net/reference/materials/data/
- RFC 9319, The Use of maxLength in the Resource Public Key Infrastructure (RPKI): https://datatracker.ietf.org/doc/rfc9319/

## Issues Found
- The post said ARIN membership was required for direct IPv6 allocations. I corrected this because ARIN explicitly states membership is not required to request resources.
- The ISP allocation eligibility criteria were outdated. I replaced the old IPv4-or-200-customers language with the current NRPM 6.5.2 criteria, including the current technical-justification path and the minimum 50 assignments within five years requirement.
- The end-user assignment criteria were incomplete and partially outdated. I updated them to reflect the current NRPM 6.5.8 criteria, including the 2000-address, 200-/64, 13-site, multihoming, and provider-assigned-space-unsuitable paths.
- The fee section used outdated pricing and framed fees as membership-related. I replaced it with the current 2026 Registration Services Plan fee categories relevant to IPv6 holdings.
- The application workflow incorrectly included a membership step and an imprecise request path. I corrected it to ARIN Online account/POC/Org ID preparation, the current request navigation, current analyst review timing, and the RSA/payment step.
- The post claimed ARIN would assign space from `2600::/12`. I removed that specific statement because ARIN issues from its available holdings and the guide should not imply a fixed originating block.
- The RPKI section used an outdated navigation label and unsupported third-party verification examples. I corrected the ARIN Online path, referenced ARIN's Reg-RWS API, and aligned the `maxLength` guidance with ARIN's current best-practice recommendations.
- The Whois example used RIPE-style field names such as `inetnum`, `admin-c`, and `status: ALLOCATED PA`, which are not ARIN Whois field names. I replaced that example with ARIN-specific fields such as `NetRange`, `CIDR`, `NetName`, `NetType`, `Organization`, and `OrgId`.
- The checklist script used non-official third-party APIs and a loose Whois query. I replaced those with ARIN-documented `whois -h whois.arin.net "r = ..."` usage, the official ARIN ROA Reg-RWS endpoint, and a direct reverse-DNS check.
- The overview text said IPv6 space came in two forms while listing three. I corrected that inconsistency.

## Review Notes
- ARIN recommends standardized Whois/RDAP access generally, but ARIN still documents port 43 Whois queries for CLI use, so the retained `whois` example is valid.
- ARIN fee categories and NRPM policy sections can change over time. Future revalidation should re-check the then-current Fee Schedule and NRPM sections 6.5.2 and 6.5.8.
- ROA `maxLength` should match the most specific prefix actually announced to the Internet; broader values increase exposure to misconfiguration or forged-origin subprefix hijacks.
