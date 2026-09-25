# Validation Summary: How to Separate PCI DSS Internal Risk Rankings from ASV Passing Rules

## Status

validated

## Post Type

Technical guide. The post provides vulnerability-record fields and implementation guidance for separating internal risk decisions from external ASV scan dispositions, so it qualifies for technical review despite containing no executable code.

## Technologies Covered

- PCI DSS vulnerability management, including Requirements 6.3.1, 6.3.3, 11.3.1, and 11.3.1.1.
- Approved Scanning Vendor (ASV) external vulnerability scans and dispute handling.
- Common Vulnerability Scoring System (CVSS) scores and vulnerability identifiers (CVEs).
- Vulnerability evidence records, environmental risk assessment, remediation, and rescanning.

## Sources Consulted

- [PCI SSC FAQ 1597](https://www.pcisecuritystandards.org/faqs/1597/): internal risk ranking, targeted risk analysis, and patch timeframes; updated May 2025.
- [PCI SSC FAQ 1152](https://www.pcisecuritystandards.org/faqs/1152/): external passing criteria, automatic failures, and collections of scan/rescan results.
- [PCI SSC FAQ 1234](https://www.pcisecuritystandards.org/faqs/1234/): the limited scope of an ASV scan report and use of official reporting templates.
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/): authoritative publication location; lists PCI DSS v4.0.1.
- [Tenable PCI ASV dispute documentation](https://docs.tenable.com/pci-asv/Content/pci-asv/legacy/Disputes.htm): vendor documentation confirming ASV review of false positives, compensating controls, and disputed severity.

## Issues Found

No technical issues found.

## Review Notes

- README.md required no changes. Its distinction between internal environmental ranking and ASV disposition is supported by the cited PCI SSC FAQs and ASV vendor documentation.
- FAQ 1597 explicitly supports the stated one-month deadline for critical patches and risk-based timeframes for other applicable patches. The post correctly separates patch timing from scan scheduling.
- FAQ 1152 supports the CVSS 4.0 threshold, automatic-failure qualification, and preservation of scan/rescan sequences when new findings arise.
- The field list is an illustrative data model, not executable code, a vendor API, or a mandated PCI SSC schema. No syntax, CLI, dependency, or runtime tests apply.
- Evidence preservation, endpoint-specific observations, ownership, and reconsideration triggers are engineering recommendations consistent with the documented processes; the post does not present those exact fields as mandatory PCI DSS requirements.
- All links in the post were checked. The three FAQ URLs and document-library URL resolve to the intended resources. The author URL redirects to the matching GitHub profile.
- Direct retrieval of the ASV Program Guide v4.0 revision 2 PDF from PCI SSC was attempted but blocked with HTTP 403. Detailed guide provisions were therefore not independently inspected; the review used the accessible PCI SSC FAQs and Tenable's primary vendor documentation for the claims made here. Tenable's page is under a legacy documentation path and was used only to corroborate the general dispute workflow.
- Internal risk acceptance alone is not evidence that a required remediation or treatment obligation has been satisfied. The post already requires resolution of high/critical internal findings and treatment of lower-ranked findings under the applicable targeted risk analysis.
