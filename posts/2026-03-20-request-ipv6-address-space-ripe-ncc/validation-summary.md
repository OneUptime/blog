# Validation Summary: How to Request IPv6 Address Space from RIPE NCC

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and allocation policy
- RIPE NCC membership and LIR workflows
- RIPE Database (`inet6num`, `route6`, Whois)
- RPKI / ROA management

## Sources Consulted
- RIPE NCC home page: https://www.ripe.net/
- How to Become a Member: https://www.ripe.net/languages/en/membership/
- Become a RIPE NCC Member: https://www.ripe.net/membership/member-support/become-a-member/
- RIPE NCC Charging Scheme 2026: https://www.ripe.net/publications/docs/ripe-848/
- Assessment Criteria for IPv6 Allocations: https://www.ripe.net/manage-ips-and-asns/ipv6/request-ipv6/assessment-criteria-for-ipv6-allocations/
- How to Request an IPv6 PI Assignment: https://www.ripe.net/manage-ips-and-asns/ipv6/request-ipv6/how-to-request-an-ipv6-pi-assignment/
- Obtain and Register IPv6: https://www.ripe.net/publications/ipv6-info-centre/deployment-planning/obtain-and-register-ipv6/
- Using the Hosted Certification Authority: https://www.ripe.net/manage-ips-and-asns/resource-management/rpki/resource-certification-roa-management/
- RIPE Database docs, Descriptions of Primary Objects: https://docs.db.ripe.net/RPSL-Object-Types/Descriptions-of-Primary-Objects/
- RIPE Database docs, Command Line Queries: https://docs.db.ripe.net/How-to-Query-the-RIPE-Database/Command-Line-Queries/
- RIPE Database docs, Protection of Route(6) Object Space: https://docs.db.ripe.net/Authorisation/Protection-of-Route-Object-Space/

## Issues Found
- The post said to start LIR registration in the LIR Portal. I changed this to the RIPE NCC membership application at `https://my.ripe.net`, because the LIR Portal is available after the account is activated.
- The application requirements and fee figure were outdated. I replaced them with the current RIPE NCC membership inputs and the 2026 fees of EUR 1,000 sign-up plus EUR 1,800 annual fee.
- The post incorrectly said new LIRs automatically receive a `/32`. I corrected this to the current request-based process: members request IPv6 space through the LIR Portal, and eligible LIRs qualify for an initial allocation from `/32` up to `/29` without additional justification.
- The additional-allocation section used outdated slow-start guidance (`/32 -> /31 -> /30`) and a `50%` utilization threshold. I replaced this with RIPE NCC's current criteria: extend existing smaller allocations up to `/29` without further justification, and for requests beyond `/29`, document sufficient utilization or justify new needs.
- The end-user section incorrectly said an organisation could become a member and request a `/48` directly as an alternative to PI sponsorship. I corrected this to the current RIPE model: IPv6 PI assignments are requested through a sponsoring LIR, and upstream LIR assignments remain another option.
- The RIPE Database examples were incomplete for current object templates and the `route6` example used private ASN `AS65001`. I added the mandatory `source:` attribute, included `org:` in the `inet6num` examples, and changed the route origin to public ASN `AS12345`.
- The RPKI instructions were too narrow. I updated them to the current RPKI dashboard workflow and noted that a Hosted or Delegated CA may need to be created before ROAs can be managed.
- The Whois commands were not written in RIPE's documented command-line format. I updated them to use `whois -h whois.ripe.net -- <query-string>` and made the `route6` lookup exact.

## Review Notes
- Validation was performed against RIPE NCC and RIPE Database documentation current on 2026-04-23.
- The local environment did not have the `whois` client installed, so command syntax was verified against the official RIPE Database command-line documentation rather than local `--help` output.
