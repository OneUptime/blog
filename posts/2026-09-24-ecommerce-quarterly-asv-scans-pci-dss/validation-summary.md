# Validation Summary: How to Determine Whether Your E-Commerce Site Needs Quarterly ASV Scans

## Status

validated

## Post Type

Technical guide. Although there are no executable examples, the post provides technical implementation details about checkout architectures, external scan scope, infrastructure coverage, and change-triggered scanning. It therefore warrants technical review rather than classification as a non-code article.

## Technologies Covered

- PCI DSS v4.0.1 and Requirements 11.3.2 and 11.3.2.1.
- Approved Scanning Vendor (ASV) external vulnerability scanning.
- SAQ A and SAQ A-EP payment architectures.
- Hosted checkout redirects, embedded iframes, Direct Post forms, and merchant APIs handling card data.
- Public hostnames, IP addresses, CDNs, WAFs, and origin infrastructure.
- Third-party service provider responsibilities and Attestations of Compliance (AOCs).

## Sources Consulted

- [PCI SSC FAQ 1604, June 2026](https://www.pcisecuritystandards.org/faqs/1604/): redirect chains, nested iframes, SAQ A applicability, and approved ASV services.
- [PCI SSC FAQ 1087](https://www.pcisecuritystandards.org/faqs/1087/): scan intervals, remediation timing, planned change freezes, and additional significant-change scans.
- [PCI SSC ASV resource guidance](https://blog.pcisecuritystandards.org/resource-guide-vulnerability-scans-and-approved-scanning-vendors): merchant systems hosting redirect or embedded-payment pages.
- [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/): confirmed the PCI DSS v4.0.1 resource. The linked standard PDF returned HTTP 403 during retrieval.
- [PCI SSC-authored PCI DSS v4.0.1 SAQ A, Revision 1, January 2025, hosted by Whova](https://whova.com/wp-content/uploads/2026/04/Whova_PCI_4_0_1.pdf): reviewed the questionnaire's eligibility criteria and Requirements 11.3.2, 11.3.2.1, 12.8.4, and 12.8.5. Used the requirement text, not the hosting organization's compliance responses, as evidence.
- [PCI SSC Approved Scanning Vendors directory](https://www.pcisecuritystandards.org/assessors_and_solutions/approved_scanning_vendors/): confirmed the vendor-list resource.
- [PCI SSC FAQ 1291](https://www.pcisecuritystandards.org/faqs/1291/): Direct Post versus iframe/redirect payment flows and SAQ selection.
- [PCI SSC Best Practices for Securing E-commerce, April 2017](https://www.pcisecuritystandards.org/pdfs/best_practices_securing_ecommerce.pdf), Section 7.5: provider-hosted scanning arrangements and merchant responsibility. This older supplement was used for architectural guidance, not current requirement numbering.
- [PCI SSC Third-Party Security Assurance supplement](https://listings.pcisecuritystandards.org/documents/PCI_DSS_V3.0_Third_Party_Security_Assurance.pdf): checking service coverage in AOCs and scan evidence. Current responsibility requirements were cross-checked in the v4.0.1 questionnaire.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. No code, commands, or configuration snippets required execution or syntax checks.
- FAQ 1604 supports the stated June 2026 clarification, including intermediate redirects and nested iframes. Outsourcing card processing does not by itself remove the merchant webpage from the relevant scan scope.
- The distinction between quarterly ASV scans and significant-change scans is correct. Requirement 11.3.2.1 permits qualified personnel with organizational independence and does not mandate ASV status. It also requires remediation of CVSS scores of 4.0 or above and rescans as needed; the post does not attempt to reproduce every clause.
- The three-month cadence and remediation guidance agree with FAQ 1087. Grouping four scans together does not establish a year of periodic scanning.
- The payment-arrangement table appropriately treats SAQ selection as an investigation requiring full eligibility review. An API receiving card data is inconsistent with SAQ A's prohibition on electronic account-data handling by merchant systems.
- Provider evidence and responsibility allocation are appropriate. Advice to discuss CDN, WAF, and origin coverage with the ASV avoids making an unsupported blanket exclusion or inclusion rule.
- All links present in the post resolved to the intended resource, including the author's GitHub profile. The document library itself was accessible; its downstream standard PDF and the separately linked ASV resource-guide PDF could not be retrieved. The accessible PCI SSC guidance and PCI SSC-authored questionnaire supplied the relevant corroboration.
- This review validates the article's technical statements; determining an individual merchant's scope still depends on its actual architecture and the organization receiving its compliance submission.
