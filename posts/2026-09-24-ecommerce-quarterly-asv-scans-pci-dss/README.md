# How to Determine Whether Your E-Commerce Site Needs Quarterly ASV Scans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security Scanning, Compliance

Description: Determine ASV scan applicability for redirect, iframe, and merchant-hosted e-commerce flows, then document ownership, coverage, and passing-scan cadence.

---

An e-commerce site can require external vulnerability scans even when a payment provider handles every card number. The merchant website can still be compromised to change where the customer pays.

PCI SSC's [June 2026 FAQ 1604](https://www.pcisecuritystandards.org/faqs/1604/) explicitly confirms that SAQ A ASV requirements apply to merchant webpages that redirect to a provider or contain the provider's embedded payment form. The same clarification includes additional redirect hops and nested iframes.

## Classify the merchant's actual web presence

Start with the page that initiates payment and trace the customer journey. Record the public hostnames, hosting provider, payment provider, and who can publish or configure the page.

| Payment arrangement | What to investigate |
| --- | --- |
| Merchant page redirects to hosted checkout | Merchant system hosting the redirecting page |
| Merchant page embeds provider payment form | Merchant system hosting the containing page |
| Merchant-generated form posts directly to provider | Applicable SAQ A-EP or broader assessment and external scan scope |
| Merchant API receives card data | Broader CDE and externally exposed in-scope systems |
| Provider sends a payment link without a merchant payment webpage | Confirm the actual outsourced arrangement and applicability with the submission recipient |

The last row is not an automatic exemption for the entire business. A marketing site may contain a payment link, a commerce plugin may host part of the journey, or another payment channel may have different requirements. Document what exists rather than reasoning from the phrase “fully outsourced.”

The [PCI SSC ASV resource guidance](https://blog.pcisecuritystandards.org/resource-guide-vulnerability-scans-and-approved-scanning-vendors) explains the SAQ A focus on systems hosting redirect or embedded-payment webpages.

## Separate applicability from scan ownership

If the merchant controls the web infrastructure, identify the team that schedules scans, resolves findings, and maintains the asset list. If a provider hosts it, determine whether the provider performs the relevant scanning and which evidence the merchant can rely on.

Collect the provider's relevant AOC and responsibility allocation. A generic statement that the provider is compliant does not establish whether your domains, configuration, or merchant-controlled components are covered.

Agree the arrangement with the ASV and the organization receiving the compliance submission. Avoid scanning another party's infrastructure without authorization. Where a managed platform owns the infrastructure, obtain its documented scanning process and the evidence required for your validation.

## Use the right scanning service

Requirement 11.3.2 of [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/) requires external scans at least once every three months by a PCI SSC Approved Scanning Vendor, resolution of findings to the ASV passing criteria, and rescans where needed.

An ordinary vulnerability scanner, an internal scan, or a web application penetration test does not replace the ASV service. Confirm the company is on the current [PCI SSC ASV list](https://www.pcisecuritystandards.org/assessors_and_solutions/approved_scanning_vendors) and that the service being purchased is its approved ASV scan offering.

Give the ASV a complete, reviewed inventory. Include relevant public addresses, hostnames, hosting changes, and delivery layers. Discuss CDN, WAF, and origin coverage with the ASV rather than silently omitting an origin because the public hostname resolves to a CDN.

## Schedule enough time to reach a passing result

Put the initial scan early enough in the cycle to fix findings and rescan. Four scans performed in a short burst before an assessment do not demonstrate a year of periodic scanning.

[PCI SSC FAQ 1087](https://www.pcisecuritystandards.org/faqs/1087/) explains that scans and necessary remediation should be completed at least every three months, with the intervals kept close to that schedule. Plan around known change freezes rather than using them as an excuse for a late scan.

Retain the scan scope, original findings, remediation evidence, rescans, and official final reports. Track new findings to an owner and verify that fixes remain deployed. A passing result is evidence for that tested state and period, not a permanent certificate for the site.

## Handle significant changes separately

Requirement 11.3.2.1 requires external vulnerability scans after significant changes. These are additional to the periodic scans. The requirement allows qualified, organizationally independent personnel for the change-triggered scan; it does not require that every such scan be performed by an ASV.

Define triggers with the security and change-management teams: new public services, substantial network changes, replaced hosting platforms, and significant application or infrastructure changes. Evaluate each change against the actual scope rather than relying on a release label such as “minor.”

Keep a dated applicability decision with the data-flow diagram, provider responsibilities, ASV inventory, and scan calendar. Review it when checkout architecture or hosting changes. That gives the team a concrete answer about which systems need scanning and who must produce the evidence.
