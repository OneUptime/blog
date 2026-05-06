# Validation Summary: How to Comply with Government IPv6 Mandates

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- US federal IPv6 policy (OMB M-05-22, OMB M-21-07)
- USGv6 / NIST IPv6 procurement requirements
- FISMA CIO metrics
- FedRAMP
- Section 508
- DNS, HTTPS/TLS, `curl`, and `dig`

## Sources Consulted
- OMB M-21-07, "Completing the Transition to Internet Protocol Version 6 (IPv6)": https://www.whitehouse.gov/wp-content/uploads/2020/11/M-21-07.pdf
- OMB M-05-22, "Transition Planning for Internet Protocol Version 6 (IPv6)": https://georgewbush-whitehouse.archives.gov/omb/memoranda/fy2005/m05-22.pdf
- NIST USGv6 Technical Details: https://www.nist.gov/programs-projects/usgv6-program/technical-details
- NIST USGv6 Revision 1: https://www.nist.gov/programs-projects/usgv6-program/usgv6-revision-1
- NIST SP 500-267Br1, USGv6 Profile: https://doi.org/10.6028/NIST.SP.500-267Br1
- NIST USGv6 deployment monitor: https://usgv6-deploymon.nist.gov/
- CISA FY 2025 CIO FISMA Metrics: https://www.cisa.gov/sites/default/files/2025-01/FY25_FISMA_CIO_Metrics_v1.1.pdf
- FedRAMP documentation, "Is FedRAMP Right For You?": https://www.fedramp.gov/docs/rev5/playbook/csp/authorization/getting-started/
- Section508.gov, Section 508 of the Rehabilitation Act: https://www.section508.gov/manage/laws-and-policies/section-508-law/
- European Commission, "Helping European public bodies use the most common ICT specifications": https://digital-strategy.ec.europa.eu/en/news/helping-european-public-bodies-use-most-common-ict-specifications
- State Council of the People's Republic of China, "China to speed up IPv6-based internet development": https://english.www.gov.cn/policies/latest_releases/2017/11/26/content_281475955112300.htm
- Department of Telecommunications, India, National Telecom Policy 2012: https://www.dot.gov.in/static/uploads/2025/07/fa5f584dc27ac3e15d907e53b11f4f39.pdf
- Department of Telecommunications, India, roadmap listing: https://dot.gov.in/hi/glossary?page=276&theme=dot_green
- ASD / cyber.gov.au, Guidelines for networking: https://www.cyber.gov.au/business-government/asds-cyber-security-frameworks/ism/cyber-security-guidelines/guidelines-for-networking

## Issues Found
- The introduction incorrectly grouped APNIC and RIPE with government mandate sources. I rewrote it to distinguish US OMB mandates from non-government policy and roadmap activity elsewhere.
- The OMB section overstated M-21-07 by claiming all internet-facing and internal federal systems had to be IPv6-only by FY 2025, and it misdescribed the 80% milestone as a traffic target. I corrected this to the actual M-21-07 requirements: new systems IPv6-enabled by FY 2023, phased IPv6-only asset milestones of 20%/50%/80% by FY 2023-2025, and full IPv6 support for shared services.
- The federal compliance checklist incorrectly stated that TLS certificates must be valid for IPv6 addresses. I corrected this to the technically accurate requirement: HTTPS over IPv6 must present a certificate valid for the service name being used.
- The checklist also made overly broad or vendor-specific claims about internal networks and cloud services. I replaced those with the actual OMB language around native IPv6 use, asset milestones, procurement requirements, and shared-service IPv6-only capability with feature/performance parity.
- The sample script overclaimed its mail check by only testing the first MX record. I updated it to check all advertised MX hosts, clarified that the script is a readiness check, quoted variables, and tightened the `curl`/`grep` logic. The resulting script was syntax-checked successfully.
- The contractor section incorrectly presented FedRAMP and Section 508 as direct IPv6 mandates. I corrected the section so FedRAMP is described as a cloud security authorization program, Section 508 is described as accessibility law, and IPv6 obligations are tied back to acquisition and system authorization requirements.
- The procurement example cited `NIST SP 500-267B` without the current revision naming. I updated it to `NIST SP 500-267Br1`.
- The reporting section used unsupported quarterly metrics claims such as `% of internet-accessible systems with IPv6` and `% of IPv6 traffic on public-facing services`. I replaced these with the current FY 2025 CIO FISMA metrics model that explicitly tracks IPv4-only, dual-stack, and IPv6-only GFE asset counts for M-21-07 reporting.
- The international section overstated several jurisdiction-specific items as if they were all equivalent mandates. I reframed that section as policies/programs/roadmaps and aligned each bullet to authoritative government sources.

## Review Notes
- M-21-07 explicitly notes that some public internet services may need to keep IPv4 interfaces and transition mechanisms at the edge for additional time, even while backend infrastructure moves toward IPv6-only operation.
- The NIST USGv6 deployment monitor is useful for measuring external DNS, mail, and web IPv6 reachability, but it is not a formal compliance certification tool and does not assess full USGv6 profile conformance.
- The sample shell commands were verified against local CLI help for `curl` and `dig`, and the revised shell script was syntax-checked with `bash -n` and `sh -n`.
