# Validation Summary: How to Request IPv6 Address Space from ARIN

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 address allocation and assignment policy
- ARIN Online resource request workflow
- ARIN Number Resource Policy Manual (NRPM)
- ARIN Registration Services Agreement (RSA)
- RPKI and ROA management
- BGP route origination security

## Sources Consulted
- ARIN Your First IPv6 Request: https://www.arin.net/resources/guide/ipv6/first_request/
- ARIN Requesting IP Addresses or ASNs: https://www.arin.net/resources/guide/request/
- ARIN Number Resource Policy Manual (NRPM): https://www.arin.net/participate/policy/nrpm/
- ARIN Agreements: https://www.arin.net/about/corporate/agreements/
- ARIN Fee Schedule: https://www.arin.net/resources/fees/fee_schedule/
- ARIN Route Origin Authorizations (ROAs): https://www.arin.net/resources/manage/rpki/roas/
- ARIN RPKI Best Practices and Troubleshooting: https://www.arin.net/resources/manage/rpki/help/bestpractices/
- RFC 9319, The Use of maxLength in the Resource Public Key Infrastructure (RPKI): https://www.rfc-editor.org/info/rfc9319

## Issues Found
1. **Incorrect ARIN Online navigation**: The post said to request IPv6 space through `ARIN Online → IPv6 → Request IPv6 Address Space`. Current ARIN guidance uses `IP Addresses → Request`. I corrected the navigation and removed unverified field-by-field UI claims.

2. **RSA timing and prerequisite wording were inaccurate**: The original post treated a signed RSA as a simple prerequisite before the request. Current ARIN guidance is more specific: requests require an ARIN Online account linked to an authorized POC and valid Org ID, and ARIN requires a signed current RSA before issuing resources. I updated the prerequisites and RSA section to reflect that.

3. **ISP qualification guidance did not match current policy**: The original justification section listed generic items such as customer counts and a network diagram. Current ARIN policy for initial ISP allocations is governed by NRPM `6.5.2`, including qualification by prior IPv4 ISP allocation, immediate IPv6 multihoming with a global ASN, or detailed technical justification with one-, two-, and five-year reassignment/reallocation plans and at least 50 assignments within five years. I replaced the generic list with policy-aligned criteria.

4. **Initial allocation sizing table was inaccurate**: The original table tied `/32` to holding a `/20` of IPv4, suggested `/28` or `/24` as a typical large-ISP initial allocation without policy support, and omitted ARIN's current handling of `/36` and limited `/40` requests. I replaced the table with current minimum sizing guidance and notes for ISP/LIR, end-user, and critical-infrastructure cases.

5. **Post-approval flow omitted important issuance conditions**: The original text implied that approval directly resulted in allocation and confirmation to the technical POC. ARIN's current request process distinguishes approval from issuance and requires the signed RSA and applicable fees before resources are issued. I corrected the sequence and clarified that global routing visibility depends on actual BGP announcement and acceptance by other networks.

6. **ROA workflow and maxLength advice were wrong**: The original ROA instructions used the wrong ARIN Online path and suggested that `maxLength` is typically the same as the allocated prefix. Current ARIN documentation has users go through `Routing Security → Manage RPKI → Create ROA`, and ARIN's best-practices guidance warns against liberal use of `maxLength`. I corrected the creation steps and changed the guidance to use the narrowest `maxLength` consistent with actual announcements.

7. **Fee explanation and timeline were too loose**: The original fee section reduced fees to allocation size and IPv4/IPv6 holdings, and the conclusion claimed a `1-5 business days` process for straightforward ISP requests. ARIN's current fee schedule is based on aggregate IPv4, IPv6, or ASN holdings under the Registration Services Plan, and ARIN says it typically follows up on requests within two business days, with issuance after receipt of the RSA and fees. I updated both statements.

## Review Notes
- The post remains technically relevant after correction.
- ARIN Online interface labels can change over time, so any future revision should recheck the exact menu wording against the live ARIN portal.
- The article still reads primarily as an ISP-focused guide even though the description mentions both ISPs and end users, but that is an editorial scope issue rather than a technical accuracy problem.
