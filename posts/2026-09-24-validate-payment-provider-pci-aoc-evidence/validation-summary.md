# Validation Summary: How to Validate a Payment Provider’s PCI Status and Collect AOC Evidence

## Status
not-code-blog

## Post Type
Compliance evidence-review guide.

## Technologies Covered
- Payment-provider PCI DSS compliance, including PCI DSS v4.0.1.
- Third-party service provider (TPSP) assessment scope and customer responsibilities.
- Attestations of Compliance (AOCs), Reports on Compliance (ROCs), and Self-Assessment Questionnaires (SAQs).
- Compliance evidence collection, retention, and periodic review.

## Sources Consulted
- Local post: `posts/2026-09-24-validate-payment-provider-pci-aoc-evidence/README.md` (read to determine post type).
- No external sources were consulted. Step 1 directs posts without code or technical implementation details to skip technical verification and proceed to the validation deliverables.

## Issues Found
No technical issues found during the post-type screening. Technical claims and external links were not independently verified because the post qualifies for the Step 1 exclusion.

## Review Notes
The post describes a procedural compliance review workflow. It contains no executable code, terminal commands, configuration snippets, or technical implementation instructions. References to payment integrations, data flows, and administrative access provide context for evidence review rather than implementation details. The post remains relevant to software engineering security and compliance; the classification does not recommend removal. README.md was left unchanged. This status records the post-type classification, not a completed technical or compliance validation.

## Follow-up Source Verification — 2026-09-24

A separate substantive review found no factual error. FAQs 1065 and 1576 support service-specific evidence, requests for relevant ROC/SAQ D material, and the insufficiency of merchant SAQ A evidence for provider services. FAQ 1312 supports the article's distinction between monitoring a provider's status and demonstrating outsourced controls. November 2025 FAQ 1601 confirms evidence accepted when reviewed remains valid for that assessment, with timely documentation updates and acceptance decisions belonging to compliance-program authorities.

Requirements 12.8.2, 12.8.4, and 12.8.5 were checked directly, including the distinction between contractual acknowledgement and compliance evidence. README text, title, and `not-code-blog` classification were retained.

### Follow-up Sources Consulted

- [PCI SSC FAQ 1065](https://www.pcisecuritystandards.org/faqs/1065/), provider evidence and merchant SAQ limitations.
- [PCI SSC FAQ 1576](https://www.pcisecuritystandards.org/faqs/1576/), applicable AOCs, supporting evidence, and responsibility information.
- [PCI SSC FAQ 1312](https://www.pcisecuritystandards.org/faqs/1312/), customer obligations when using TPSPs.
- [PCI SSC FAQ 1601](https://www.pcisecuritystandards.org/faqs/1601/), assessment evidence approaching a year old.
- [PCI SSC: PCI DSS v4.0.1 — public mirror](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf), Requirements 12.8.2, 12.8.4, and 12.8.5. The PCI-authored PDF was downloaded and read directly after the canonical PCI-hosted PDF returned HTTP 403.
