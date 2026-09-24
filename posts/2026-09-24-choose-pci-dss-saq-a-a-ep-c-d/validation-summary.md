# Validation Summary: How to Choose the Correct PCI DSS SAQ: A, A-EP, C, or D

## Status

validated

## Post Type

Technical guide to payment architecture and PCI DSS self-assessment eligibility. Although there are no executable code blocks, commands, or configuration snippets, the post contains technical implementation details about browser payment forms, direct post, iframes, redirects, API data flows, and network isolation. It therefore qualifies for technical review.

## Technologies Covered

- PCI DSS v4.0.1 and Self-Assessment Questionnaires A, A-EP, C, and D.
- Related SAQs C-VT, B-IP, and P2PE; merchant and service-provider assessment boundaries.
- HTML payment forms, embedded iframes, redirects, JavaScript, and direct-post payment integrations.
- Payment APIs, primary account numbers (PANs), tokenization, and electronic account-data storage.
- Internet-connected POS applications, virtual terminals, and network segmentation.
- Script-attack protection, Approved Scanning Vendor (ASV) scans, and provider Attestations of Compliance (AOCs).

## Sources Consulted

- [PCI SSC: SAQs for PCI DSS v4.0.1 Now Available, October 2024](https://www.pcisecuritystandards.org/wp-content/uploads/2024/10/SAQs_for_PCI_DSS_v4.0.1_Bulletin.pdf) — eligibility confirmation and submission-recipient guidance.
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — verified the post links to the official standards and SAQ publication location.
- [PCI SSC self-assessment overview](https://listings.pcisecuritystandards.org/pci_security/completing_self_assessment) — payment-channel distinctions and merchant versus service-provider SAQs.
- [PCI SSC FAQ 1291](https://www.pcisecuritystandards.org/faqs/1291/) — direct-post versus iframe/redirect payment-page origins.
- [PCI SSC January 2025 SAQ A revision announcement](https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a) — removed questionnaire requirements, added eligibility criterion, and continuing underlying PCI DSS requirements.
- [PCI SSC FAQ 1588](https://www.pcisecuritystandards.org/faqs/1588/) — embedded-payment script protections, provider confirmation, and redirect exclusion from that particular criterion.
- [PCI SSC FAQ 1604, June 2026](https://www.pcisecuritystandards.org/faqs/1604/) — ASV scanning for merchant webpages using redirects or embedded iframes.
- [PCI SSC SAQ Instructions and Guidelines v3.2, historical reference](https://listings.pcisecuritystandards.org/documents/SAQ-InstrGuidelines-v3_2.pdf) — corroborated the described SAQ C connectivity restrictions; not used as authority for current version-specific changes.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the expected profile.

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- The table explicitly presents candidate architectures rather than complete eligibility rules. The instruction to confirm all criteria and obtain the submission recipient's guidance appropriately limits its use.
- The direct-post example correctly distinguishes merchant-produced payment fields from provider-supplied iframe or redirect checkout. Immediate tokenization or avoiding persistent storage does not establish A or A-EP eligibility when the merchant API receives card data.
- The January 2025 SAQ A changes and the continuing existence of Requirements 6.4.3, 11.6.1, and 12.3.1 in PCI DSS are accurately described. The revised questionnaire took effect on March 31, 2025.
- The script criterion is correctly limited to embedded payment forms. Provider confirmation must concern protection provided by the correctly implemented payment solution; a generic compliance badge is insufficient.
- FAQ 1604 is dated June 2026 and explicitly confirms ASV scanning applies to merchant e-commerce webpages using redirects and embedded iframes. Exclusion from the script eligibility criterion does not exempt a redirect webpage from scanning requirements.
- SAQ C is correctly excluded from e-commerce. The advice to investigate C-VT for virtual terminals and distinguish service-provider SAQ D is sound. Multiple payment channels require explicit coverage and submission-recipient guidance.
- The evidence-packet suggestions are reasonable engineering review practices, not a claim that PCI SSC mandates a packet with those exact contents. Synthetic observations and schema review support a decision but do not replace the complete eligibility assessment.
- All links present in the post resolved to the intended resources. The linked self-assessment overview contains a legacy instructions link and older P2PE-HW terminology; the post already directs readers to the current Document Library for full eligibility criteria.
- Access limitation: the separately located PCI DSS v4.0.1 SAQ Instructions and Guidelines revision 1 PDF at https://docs-prv.pcisecuritystandards.org/SAQ%20(Assessment)/Instructions%20%26%20Guidance/SAQ-Instructions-Guidelines-PCI-DSS-v4-0-1-r1.pdf could not be retrieved (HTTP 403). Current claims were checked against accessible official announcements, FAQs, and the self-assessment overview; the historical instructions were used only to corroborate the general connectivity description. This review does not certify a particular merchant's eligibility.
- No executable examples or configuration files required runtime testing.
