# Validation Summary: How to Identify PCI DSS Merchant and Service Provider Roles

## Status
not-code-blog

## Post Type
Conceptual compliance guide.

## Technologies Covered
- Payment Card Industry Data Security Standard (PCI DSS).
- Cardholder data environments (CDEs) and service-provider scope.
- Merchant and service-provider assessment documents: Self-Assessment Questionnaires (SAQs), Reports on Compliance (ROCs), and Attestations of Compliance (AOCs).

## Sources Consulted
- Local post: `posts/2026-09-24-pci-dss-merchant-service-provider-both/README.md` (read to determine the post type).
- No external sources consulted. Official-documentation verification was skipped under Step 1 of the requested workflow.

## Issues Found
No implementation issues were identified during classification because the post contains no code examples, terminal commands, configuration snippets, or technical implementation details. Compliance claims and linked resources were not independently verified; this status does not certify their accuracy. No changes were made to README.md.

## Review Notes
The post discusses PCI DSS role classification, assessment scope, and validation routes at a conceptual and organizational level. References to managed firewalls, deployment systems, access controls, and network administration provide context rather than implementation instructions. Under Step 1, the post is classified as not-code-blog and Steps 2 and 3 are skipped. Both required validation artifacts were created with the requested validation date of 2026-09-24.

## Follow-up Source Verification — 2026-09-24

A separate substantive review found no factual error. The PCI SSC glossary and PCI DSS v4.0.1 Appendix G support dual merchant/service-provider roles, security-impacting services, and the narrow exclusion for merely providing public network access. FAQs 1579 and 1580 confirm scope can apply without direct account-data handling and that non-applicability decisions require justification. FAQ 1065 confirms a merchant SAQ A AOC is insufficient evidence for the provider services used by customers. February 2026 FAQ 1602 confirms the separate-or-combined assessment choice for enterprise functions and the provider validation tools directed by the accepting entity.

The article qualifies its examples and reporting choices appropriately. README text, title, and the `not-code-blog` classification were retained.

### Follow-up Sources Consulted

- [PCI SSC Glossary](https://www.pcisecuritystandards.org/glossary/), Merchant and Service Provider entries.
- [PCI SSC: PCI DSS v4.0.1 Requirements and Testing Procedures — public mirror](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf), Appendix G. The PCI-authored PDF was downloaded and read directly after the canonical PCI-hosted PDF returned HTTP 403.
- [PCI SSC FAQ 1579](https://www.pcisecuritystandards.org/faqs/1579/), service providers that can affect account-data security.
- [PCI SSC FAQ 1580](https://www.pcisecuritystandards.org/faqs/1580/), assessment scope and documented non-applicability.
- [PCI SSC FAQ 1065](https://www.pcisecuritystandards.org/faqs/1065/), provider compliance evidence and merchant SAQ limitations.
- [PCI SSC FAQ 1602](https://www.pcisecuritystandards.org/faqs/1602/), enterprise/internal service-provider assessments and validation tools.
