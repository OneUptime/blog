# Validation Summary: How to Request IPv6 Address Space from APNIC

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and allocations
- APNIC membership and resource policy
- MyAPNIC
- APNIC Whois Database and IRR objects
- RPKI and ROAs

## Sources Consulted
- APNIC Internet Number Resource Policies: https://www.apnic.net/community/policy/resources
- APNIC Member Fee Schedule: https://www.apnic.net/about-apnic/corporate-documents/documents/membership/member-fee-schedule/
- APNIC Get IP: https://www.apnic.net/get-ip/
- APNIC Membership and Internet Resource Application Process: https://www.apnic.net/get-ip/application-process/
- APNIC Service Region: https://www.apnic.net/about-apnic/corporate-documents/documents/corporate/apnic-service-region/
- APNIC IPv6 allocation and assignment request guidelines: https://www.apnic.net/about-apnic/corporate-documents/documents/resource-guidelines/ipv6-guidelines/
- APNIC Portable assignment guidance: https://www.apnic.net/get-ip/get-ip-addresses-asn/check-your-eligibility/portable-assignments/
- APNIC Recording network assignments: https://www.apnic.net/manage-ip/using-whois/updating-whois/network-assignments/
- APNIC `inet6num` guide: https://www.apnic.net/manage-ip/using-whois/guide/inet6num/
- APNIC `route6` guide: https://www.apnic.net/manage-ip/using-whois/guide/route6/
- APNIC route object creation guide: https://www.apnic.net/manage-ip/using-whois/guide/creating-route-objects/
- APNIC MyAPNIC overview: https://www.apnic.net/manage-ip/myapnic/
- APNIC RPKI / Resource Certification: https://www.apnic.net/manage-ip/apnic-services/resource-certification/
- APNIC Resource Certification guide: https://www.apnic.net/wp-content/uploads/2017/01/GuideResourceCertificationForMyAPNIC.pdf
- APNIC Route Management guide: https://www.apnic.net/wp-content/uploads/2017/12/ROUTE_MANAGEMENT_GUIDE.pdf

## Issues Found
- The fee table was outdated and incorrect. APNIC currently uses a sign-up fee plus an annual fee schedule based on total IPv4 or IPv6 holdings, so the simplified ISP-tier pricing table was replaced with the current fee model.
- The membership application URL was wrong. The post referenced `https://www.apnic.net/membership/apply/`, which is not the current application entry point, so it was updated to APNIC's current Get IP page and membership application form URL.
- The pre-registration section incorrectly implied an ASN is required or expected before requesting IPv6 space. It was updated to reflect APNIC's actual regional and NIR eligibility checks.
- The initial allocation section incorrectly said new members receive a /32 automatically via MyAPNIC in 1-2 business days. It was updated to the documented new-member workflow, current minimum /32 policy, and APNIC's stated 2-5 working day evaluation window.
- The subsequent allocation section used an incorrect 50% utilization rule and implied fixed /31 or /30 outcomes. It was updated to APNIC's current HD-Ratio 0.94 criteria based on /56 assignments and the usual doubling behavior for subsequent allocations.
- The PI assignment criteria were wrong. The post was updated to APNIC's current initial /48 PI policy, which is based on eligibility for an APNIC account plus a commitment to use and advertise the space within 12 months.
- The Whois section incorrectly implied members create the top-level `inet6num` object for direct delegations and submit changes through `wq.apnic.net`. It was corrected to reflect that APNIC or the relevant NIR creates direct-delegation objects, while members use MyAPNIC or `auto-dbm@apnic.net` for updates they are authorized to make.
- The object examples were incomplete or invalid. Mandatory fields such as `mnt-irt` and `source` were added to the `inet6num` example, the `route6` example was updated with the required fields, and the private ASN example was replaced with a non-private example ASN aligned with APNIC's own documentation examples.
- The RPKI workflow and validator examples were outdated. The post was updated to the current MyAPNIC Resource Certification and Route Management flow, and the obsolete validator API example was removed.

## Review Notes
- Organizations in economies served by an NIR may need to work through that NIR rather than applying directly to APNIC.
- MyAPNIC menu labels and workflow details can evolve over time, so the portal steps should be rechecked if this post is updated again later.
- The documentation prefix `2001:db8::/32` remains appropriate for examples in the post.
