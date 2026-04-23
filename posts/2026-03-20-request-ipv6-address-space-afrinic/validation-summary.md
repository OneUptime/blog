# Validation Summary: How to Request IPv6 Address Space from AFRINIC

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 address allocation and assignment
- AFRINIC resource membership and request workflows
- AFRINIC WHOIS and IRR objects
- RPKI and ROA management
- AFRINIC policy and fee schedule guidance

## Sources Consulted
- AFRINIC service region: https://www.afrinic.net/service-region
- AFRINIC membership and resource request process: https://www.afrinic.net/why-and-how-to-become-an-afrinic-resource-member-know-your-eligibility
- AFRINIC IPv6 resource guidance: https://www.afrinic.net/resources/ipv6
- AFRINIC FAQ on requesting an IPv6 prefix: https://www.afrinic.net/support/resource-members/how-can-i-request-for-an-ipv6-prefix
- AFRINIC fee schedule: https://www.afrinic.net/membership/cost?lang=en-GB
- AFRINIC route/route6 object guidance: https://afrinic.net/support/irr/how-to/create-route-6-object
- AFRINIC WHOIS objects and attributes: https://afrinic.net/support/whois/objects-and-attributes
- AFRINIC Resource Certification Program: https://www.afrinic.net/resource-certification
- AFRINIC RPKI support page: https://afrinic.net/support/rpki
- AFRINIC IPv4 exhaustion status: https://www.afrinic.net/exhaustion
- AFRINIC general queries FAQ: https://afrinic.net/support/general-queries

## Issues Found
- The post described AFRINIC as covering "54 countries" and framed it only as an IPv6 allocator. I changed this to AFRINIC's official scope: Internet number resources for Africa and the Indian Ocean region, headquartered in Mauritius.
- The membership fee table was inaccurate. I replaced it with fee guidance that matches AFRINIC's current IPv6-related fee schedule, including the `/32`, `> /32`, and PI `/48` distinctions and the note that existing IPv4/EU members are not charged extra for issued IPv6 prefixes.
- The application workflow was wrong for new applicants. I corrected it to start on AFRINIC's New Membership Registration Portal (`apps.afrinic.net/nmrp`) and clarified that MyAFRINIC is activated after approval.
- The portal path for submitting an IPv6 request was inaccurate. I updated it to `Resources -> IPv6 Resources -> Request IPv6 resource`, which matches AFRINIC's published guidance.
- The initial allocation section was oversimplified. I corrected it to reflect AFRINIC policy: eligible LIRs receive a minimum `/32`, larger requests need justification, and PI assignments start at `/48` per site with larger nibble-aligned prefixes possible for multiple sites.
- The WHOIS section implied members create the top-level `inet6num` object themselves and the `route6` example omitted required fields. I clarified that AFRINIC creates the direct allocation object and added the `changed` and `source` fields to the `route6` example.
- The RPKI instructions were outdated. I corrected the navigation to `Resources -> Resource Certification`, added the BPKI prerequisite, and updated the ROA workflow accordingly.
- The IPv4 exhaustion context was incorrect. AFRINIC entered IPv4 Exhaustion Soft-landing Phase 2 on 13 January 2020, and AFRINIC still states that IPv4 is issued on justified need; it is not accurate to say the region simply exhausted IPv4 in 2021 or that space is only available through a waiting-list policy.

## Review Notes
Operational details in this post are subject to change, especially fees, portal navigation, and support workflows. These should be re-checked against AFRINIC's current public documentation before future republishes.
