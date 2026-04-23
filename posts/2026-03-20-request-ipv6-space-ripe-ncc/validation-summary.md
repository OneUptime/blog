# Validation Summary: How to Request IPv6 Address Space from RIPE NCC - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 allocations and IPv6 PI assignments in the RIPE NCC service region
- RIPE NCC membership, billing, and LIR onboarding
- RIPE Database objects such as `inet6num`, `route6`, `mnt-by`, `mnt-lower`, and `AGGREGATED-BY-LIR`
- RIPE Database REST API
- RPKI / ROA management in the RIPE NCC hosted certification system
- RIPEstat RPKI validation API

## Sources Consulted
- RIPE NCC, "Become a RIPE NCC Member" - https://www.ripe.net/membership/member-support/become-a-member/
- RIPE NCC, "RIPE NCC Charging Scheme 2026" - https://www.ripe.net/publications/docs/ripe-848/
- RIPE NCC, "Address Space Managed by the RIPE NCC" - https://www.ripe.net/ripe/docs/ripe-ncc-managed-address-space.html
- RIPE NCC, "Obtain and Register IPv6" - https://www.ripe.net/publications/ipv6-info-centre/deployment-planning/obtain-and-register-ipv6/
- RIPE NCC, "Assessment Criteria for IPv6 Allocations" - https://www.ripe.net/manage-ips-and-asns/ipv6/request-ipv6/assessment-criteria-for-ipv6-allocations/
- RIPE NCC, "How to Request an IPv6 PI Assignment" - https://www.ripe.net/manage-ips-and-asns/ipv6/request-ipv6/how-to-request-an-ipv6-pi-assignment/
- RIPE Database docs, "RIPE Database RESTful API" - https://docs.db.ripe.net/Update-Methods/RESTful-API
- RIPE Database docs, "Descriptions of Primary Objects" - https://docs.db.ripe.net/RPSL-Object-Types/Descriptions-of-Primary-Objects
- RIPE Database docs, "Protection of Route(6) Object Space" - https://docs.db.ripe.net/Authorisation/Protection-of-Route-Object-Space/
- RIPE NCC, "RPKI Management API" - https://www.ripe.net/publications/documentation/developer-documentation/rpki-management-api/
- RIPE NCC, "Using the Hosted Certification Authority" - https://www.ripe.net/manage-ips-and-asns/resource-management/rpki/resource-certification-roa-management/
- RIPEstat docs, "RPKI Validation Status" - https://stat.ripe.net/docs/data-api/api-endpoints/rpki-validation

## Issues Found
- The service-region section claimed RIPE IPv6 space came from `2001::/32` and `2a00::/11`. I corrected this to refer to RIPE-managed address space and `2a00::/12`, because the original prefixes were wrong.
- The fee figures were outdated. I updated the LIR membership costs to the 2026 charging scheme and clarified the separate fee model for IPv6 PI assignments through a sponsoring LIR.
- The membership section implied that approval directly results in an automatic `/32` allocation and that any first request needs technical justification. I corrected this to the current flow: the LIR account is activated after due diligence, SSA, and payment, and the IPv6 request is then made in the LIR Portal. I also corrected the rule that requests up to `/29` do not need extra justification beyond the standard criteria.
- The initial-allocation section used obsolete policy language about a fixed first `/32` and an `80%` utilisation threshold. I replaced this with the current RIPE guidance: minimum `/32`, up to `/29` without additional documentation, and further space based on HD-ratio-backed utilisation or justified new needs.
- The RIPE Database examples used outdated or incorrect object details. I corrected the top-level allocation example to reflect the RIPE-created `ALLOCATED-BY-RIR` object model, added the missing `org:` and `mnt-lower:` attributes, changed customer assignments from `ASSIGNED PA` to `ASSIGNED`, removed the unnecessary `mnt-lower:` from the assignment example, and replaced the unsupported `within 30 days` claim with the correct registration guidance.
- The API examples were stale. I updated the route6 section to the current RIPE Database REST API wording and corrected the RPKI example from the wrong `/api/whois/rpki/roas` bearer-token pattern to the current `/api/rpki/roas/publish` endpoint, `ncc-api-authorization` header, and `maximalLength` field.

## Review Notes
- The examples now use `2001:db8::/32` as documentation space. Readers must replace the example prefix and ASN with resources they actually hold before using the commands.
- RIPE billing figures are time-sensitive and should be rechecked if this post is updated in a later year.
