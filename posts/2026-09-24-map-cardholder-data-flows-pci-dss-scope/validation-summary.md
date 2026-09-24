# Validation Summary: How to Map Cardholder Data Flows and Define Your PCI DSS Scope

## Status

validated

## Post Type

Technical guide. The post includes concrete transaction-tracing, data-flow documentation, access-dependency, and segmentation-validation procedures, so it qualifies for technical review despite having no executable code.

## Technologies Covered

- PCI DSS v4.0.1, CDE scoping, and SAQ A.
- Hosted payment fields, payment tokenization, recurring billing, and HTTPS.
- Network segmentation, cloud environments, identity permissions, and deployment dependencies.
- Logging, tracing, backups, support exports, and account-data retention.

## Sources Consulted

- [PCI SSC: PCI DSS applicability](https://www.pcisecuritystandards.org/standards/pci-dss/).
- [PCI SSC: Document Library](https://www.pcisecuritystandards.org/document_library/).
- [PCI SSC: Modern Network Scoping and Segmentation Guidance announcement](https://blog.pcisecuritystandards.org/new-information-supplement-pci-dss-scoping-and-segmentation-guidance-for-modern-network-architectures).
- [PCI SSC FAQ 1332: SAQ A merchant website scope](https://www.pcisecuritystandards.org/faqs/1332/).
- [PCI SSC FAQ 1533: Sensitive authentication data after authorization](https://www.pcisecuritystandards.org/faqs/1533/).
- [PCI SSC FAQ 1318: Cardholder-data retention and protection](https://www.pcisecuritystandards.org/faqs/1318/).
- [PCI SSC FAQ 1333: Limits of pre-production testing](https://www.pcisecuritystandards.org/faqs/1333/).
- [PCI SSC FAQ 1576: Third-party compliance evidence and responsibilities](https://www.pcisecuritystandards.org/faqs/1576/).
- [PCI SSC FAQ 1580: Security-impacting service provider scope](https://www.pcisecuritystandards.org/faqs/1580/).
- [PCI SSC: SAQ D for Merchants v4.0, indexed requirement 12.5.2 applicability notes](https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Merchant.pdf).
- [PCI SSC: SAQ D for Service Providers v4.0, indexed scope-confirmation requirements](https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf).
- [PCI SSC: v3.2.1 to v4.0 Summary of Changes, requirement 12.5.2.1](https://listings.pcisecuritystandards.org/documents/PCI-DSS-v3-2-1-to-v4-0-Summary-of-Changes-r1.pdf).
- [PCI SSC: Just Published, PCI DSS v4.0.1](https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1).
- [Microsoft Learn: PCI DSS Requirement 1, including 1.2.3 and 1.2.4](https://learn.microsoft.com/en-us/entra/standards/pci-requirement-1).

## Issues Found

- The unqualified instruction to keep raw captures containing account data in a controlled environment could imply that retaining real sensitive authentication data is acceptable when access is controlled. Updated that sentence to limit capture retention to permitted data, require retention and secure-deletion controls, and state that merchants cannot retain real sensitive authentication data after authorization even in encrypted captures. This preserves the synthetic-test workflow while correcting the overly broad retention instruction, consistent with PCI SSC FAQs 1533 and 1318.

## Review Notes

- The payment-channel inventory and administrative dependency analysis appropriately address both systems handling account data and systems that can affect CDE security. The modern-network guidance citation supports cloud asset inventories, microsegmentation, and multi-cloud scope boundaries.
- The text block is an illustrative flow record, not an executable program, processor API contract, or standardized configuration schema. Its fields are internally consistent for the depicted hosted-fields integration. Actual processor integrations must be observed individually; the example does not establish that every payment-method reference removes systems from scope.
- Network and data-flow diagram references 1.2.3 and 1.2.4 are correct. The annual entity scope-confirmation cycle and six-month service-provider cycle, including significant changes, are supported by official PCI SSC materials. The entity review is distinct from the assessor review.
- The cited SAQ A FAQ supports keeping the merchant web server in scope. Retaining relevant provider attestations and documenting responsibilities is sound practice; FAQ 1576 also explains evidence alternatives where an applicable provider AOC is unavailable.
- Synthetic test transactions help discover flows but do not by themselves validate production compliance. The post also calls for examining actual data copies, permissions, and isolation evidence; FAQ 1333 explains the limits of test-only assessments.
- All four PCI SSC links in the post resolved to the intended resources. The author link is attribution rather than a technical source.
- The direct v4.0.1 standard PDF returned HTTP 403 during review. Requirement checks therefore used accessible official PCI SSC FAQs, indexed official v4.0 questionnaire/change-summary excerpts, the v4.0.1 release explanation, and Microsoft's official requirement mapping. The full v4.0.1 PDF was not directly inspected. PCI SSC describes v4.0.1 as a limited revision with no added or deleted requirements; the March 2025 effective date remains applicable.
- No executable code, commands, SDK calls, or deployable configuration required runtime testing. Validation covers the article's guidance, not an assessment of a real merchant environment.
