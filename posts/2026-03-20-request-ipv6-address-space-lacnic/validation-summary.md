# Validation Summary: How to Request IPv6 Address Space from LACNIC

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- LACNIC resource allocation policy
- MiLACNIC
- WHOIS
- RPKI
- ROAs

## Sources Consulted
- LACNIC Policy Manual, IPv6 allocation and assignment policies: https://www.lacnic.net/684/2/lacnic/
- LACNIC Get IP Addresses/ASNs: https://www.lacnic.net/1016/2/lacnic/get-ip-addresses_asns
- LACNIC Get IP Addresses/ASNs (FAQ): https://www.lacnic.net/5909/2/lacnic/get-ip-addresses_asns-faq
- LACNIC Membership Fees and Categories: https://www.lacnic.net/2399/2/lacnic/membership-categories-and-fees
- LACNIC Resource Certification (RPKI): https://www.lacnic.net/640/2/lacnic/resource-certification-system-rpki
- LACNIC Resource Public Key Infrastructure (RPKI) FAQ: https://www.lacnic.net/1151/2/lacnic/resource-public-key-infrastructure-rpki-faq
- LACNIC Whois FAQ: https://www.lacnic.net/1136/2/lacnic/whois-faq
- LACNIC Contact us: https://www.lacnic.net/630/2/lacnic/contact-us
- LACNIC Coverage Area: https://www.lacnic.net/631/2/lacnic/coverage-area
- LACNIC IP Geolocation / dbase field documentation: https://www.lacnic.net/4875/2/lacnic/lacnic-ip-geolocation-lac-2018-3-policy
- LACNIC bulk database export used to verify IPv6 status values and record patterns: ftp://ftp.lacnic.net/lacnic/dbase/lacnic.db.gz
- LACNIC WHOIS server used to verify actual record output format: whois.lacnic.net

## Issues Found
- The post used an invalid registration URL (`https://lacnic.net/registro/`). I replaced it with the current MiLACNIC account-creation and login URLs because LACNIC resource requests are submitted through MiLACNIC.
- The eligibility description for end users was too narrow. I changed it from “documented multi-homing needs” to the official end-user framing used by LACNIC: organizations using resources in their own infrastructure without sub-assigning them to third parties.
- The fee table contained unsupported approximate USD amounts and oversimplified categories. I replaced it with the official fee-model description because LACNIC publishes category-based fees by organization type and resource size rather than the simplified values shown in the draft.
- The request-form section implied a fixed `/48` for end users and included `NIR` as a direct organization type for the standard request flow. I corrected this to the current MiLACNIC flow and minimum sizes: `/32` for ISPs and `/48` for end users.
- The initial-allocation section was incomplete. I added the official policy distinction between ISPs with and without a prior LACNIC IPv4 allocation and noted that allocations larger than `/32` require justification.
- The customer delegation example used the wrong field names and status semantics for an IPv6 ISP-to-customer record. I replaced it with a LACNIC-style WHOIS example using `inetnum`, `reallocated`, `abuse-c`, and `inetnum-up`.
- The RPKI section incorrectly told readers to request a resource certificate manually in hosted mode and included an invalid validator API URL. I replaced it with the official MiLACNIC hosted/delegated workflow and LACNIC’s published origin-validation tool URL.
- The Brazil section incorrectly said resources are managed through CGI.br and suggested interacting with both LACNIC and CGI.br. I corrected this to the official guidance: organizations based in Brazil must request resources through `Registro.br`, the corresponding NIR.
- The opening description said LACNIC serves “33 countries.” I corrected this to “33 territories,” matching LACNIC’s coverage-area page.
- The contact section said phone support is available in Spanish and Portuguese without an official source. I replaced it with LACNIC’s published phone number.

## Review Notes
- The post is technically relevant and remains suitable for publication after correction.
- The WHOIS example is intentionally presented as a representative record shape, because sub-assignments are managed through MiLACNIC rather than by manually submitting raw WHOIS text.
- MiLACNIC is available in Spanish, English, and Portuguese according to LACNIC’s MiLACNIC FAQ, although that language detail is no longer central to the corrected post.
