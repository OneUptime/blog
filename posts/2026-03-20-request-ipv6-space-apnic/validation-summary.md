# Validation Summary: How to Request IPv6 Address Space from APNIC - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- APNIC membership and resource application process
- IPv6 address allocation and assignment policy
- APNIC Whois Database (`inet6num` and `route6` objects)
- RPKI and ROA management
- Routinator

## Sources Consulted
- APNIC Application Process: https://www.apnic.net/get-ip/application-process/
- APNIC Kickstart IPv6: https://www.apnic.net/get-ip/get-ip-addresses-asn/asn-requests/kickstart-your-ipv6/
- APNIC Membership Structure: https://www.apnic.net/get-ip/apnic-membership/how-much-does-it-cost/member-structure/
- APNIC Pricing and Fee Information: https://www.apnic.net/get-ip/apnic-membership/how-much-does-it-cost/
- APNIC Member Fee Schedule: https://www.apnic.net/about-apnic/corporate-documents/documents/membership/member-fee-schedule/
- APNIC Internet Number Resource Policies: https://www.apnic.net/community/policy/resources
- APNIC IPv6 Request Guidelines: https://www.apnic.net/about-apnic/corporate-documents/documents/resource-guidelines/ipv6-guidelines/
- APNIC Resource Ranges: https://www.apnic.net/manage-ip/manage-resources/address-status/apnic-resource-range/
- APNIC Minimum Prefix and Delegation Sizes: https://www.apnic.net/manage-ip/manage-resources/address-status/min-prefix/
- APNIC Whois `inet6num` object reference: https://www.apnic.net/manage-ip/using-whois/guide/inet6num/
- APNIC Whois `route6` object reference: https://www.apnic.net/manage-ip/using-whois/guide/route6/
- APNIC route object creation guide: https://www.apnic.net/manage-ip/using-whois/guide/creating-route-objects/
- APNIC Whois registration guidance: https://www.apnic.net/manage-ip/using-whois/updating-whois/network-assignments/
- APNIC RPKI overview: https://www.apnic.net/manage-ip/apnic-services/resource-certification/
- APNIC Registry API announcement: https://blog.apnic.net/2024/10/10/apnic-registry-api-now-available/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849
- RFC 5398, Autonomous System Number Reservation for Documentation Use: https://www.rfc-editor.org/info/rfc5398
- RFC 6177, IPv6 Address Assignment to End Sites: https://www.rfc-editor.org/info/rfc6177
- Routinator validity checker documentation: https://routinator.docs.nlnetlabs.nl/en/stable/validity-checker.html

## Issues Found
1. **Outdated APNIC membership tiers and fees**: The post used obsolete tier names such as `Micro` and presented flat annual fees by tier. APNIC now uses `Associate`, `Very Small`, `Small`, `Medium`, `Large`, `Very Large`, and `Extra Large`, and fees are calculated from total resource holdings rather than a fixed per-tier price table. I replaced the table with the current IPv6 tier thresholds and corrected the fee explanation.

2. **Incorrect application URL and workflow details**: The post pointed readers to `https://www.apnic.net/membership/` and described a simplified MyAPNIC request path that does not match APNIC's current application flow. I updated the post to use the current membership application URL and distinguished between new applications and Kickstart IPv6 for existing Members with IPv4 holdings.

3. **Overstated approval behavior for initial `/32` requests**: The original text implied that an initial `/32` is typically auto-approved for members in general. APNIC's current fast path applies specifically to eligible existing Members with IPv4 holdings using Kickstart IPv6, while new or larger requests are evaluated. I corrected that distinction.

4. **Misstated Whois registration responsibility**: The post implied the Member manually registers the initial direct allocation in APNIC Whois. APNIC creates Whois objects for direct delegations; Members are responsible for downstream assignments, sub-allocations, and route objects. I corrected both the process section and the database registration wording.

5. **Unsafe example prefix and ASN values**: The examples used `2400:db8::/32` and `AS65001`, which are not documentation-safe examples for published material. I replaced them with the documentation IPv6 prefix `2001:db8::/32` from RFC 3849 and the documentation ASN `AS64496` from RFC 5398.

6. **Invalid or unsupported route-object API example**: The post showed a `curl` POST to `wq.apnic.net` as though it were a supported route-object creation API. That endpoint is APNIC's Whois search service, not the documented way to create route objects. I replaced it with the supported creation methods: MyAPNIC, email updates, and a brief note that APNIC's authenticated Registry API exists for automation.

7. **Incomplete `inet6num` object example**: The original example omitted required or operationally important APNIC Whois attributes such as `mnt-irt`, and it did not reflect typical direct-delegation maintenance attributes. I added the missing fields so the example better matches APNIC's documented object format.

8. **RPKI example used an unverified API endpoint and an overly broad ROA**: The post referenced an APNIC validation API endpoint I could not verify from official APNIC documentation and used `max length: 48` for a `/32` example without explanation. I removed the unverified API call, kept the MyAPNIC creation flow, and changed the example ROA to `max length: 32` to avoid authorizing more-specific prefixes unnecessarily.

9. **Incorrect customer assignment registration guidance**: The post said to register `/29` and larger IPv6 sub-allocations in APNIC Whois. Current APNIC policy requires registration of delegations larger than `/48`, and specifically requires `/48` end-site assignments to be registered for HD-ratio evaluation. I corrected the registration guidance accordingly.

10. **Wrong status for customer assignment objects**: The customer example used `ASSIGNED PORTABLE`, but Member-created customer assignments are non-portable. I changed the example to `ASSIGNED NON-PORTABLE`.

## Review Notes
- The post remains technically relevant after correction.
- The APNIC Registry API is real and current, but the original article did not provide a documented authenticated request example, so I removed the incorrect unauthenticated `curl` sample instead of inventing one.
- A standalone non-chargeable `/48` IPv6 PI assignment does not change an Associate Member's tier; APNIC excludes that specific `/48` from membership-tier calculation.
- APNIC policy leaves end-site assignment size to the LIR/ISP; `/48` is common, but RFC 6177 explicitly moved away from a universal `/48` default for every case.
