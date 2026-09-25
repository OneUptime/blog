# Validation Summary: How to Document New Vulnerabilities Found During PCI DSS Rescans

## Status

validated

## Post Type

Technical operational guide. Although there are no executable examples, the post contains implementation details for scan coverage checks, finding correlation, remediation verification, and compliance evidence management, so it warrants technical review.

## Technologies Covered

- PCI DSS v4.0.1 vulnerability management and scanning requirements.
- Internal vulnerability scanning and external Approved Scanning Vendor (ASV) scans.
- Vulnerability risk ranking, targeted risk analysis, and security patch management.
- Cloud asset identity, container dependencies, and authenticated scan coverage.
- Scan-remediate-rescan evidence and report integrity.

## Sources Consulted

- [PCI SSC FAQ 1152](https://www.pcisecuritystandards.org/faqs/1152/) — conditions for demonstrating scanning compliance through a collection of scan results, scope coverage, original finding remediation, and ongoing remediation processes.
- [PCI SSC FAQ 1597](https://www.pcisecuritystandards.org/faqs/1597/) — internal risk ranking, resolution of high-risk and critical findings, targeted risk analysis for lower-ranked findings, and patch timing; updated May 2025.
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — verified the post's standards-library link and the listing for PCI DSS v4.0.1.
- [PCI SSC ASV resource guide announcement](https://blog.pcisecuritystandards.org/resource-guide-vulnerability-scans-and-approved-scanning-vendors) — official explanation of Requirement 11.3.2 and passing ASV scans at least once every three months.
- [PCI SSC ASV Program Guide v1.0](https://listings.pcisecuritystandards.org/pdfs/asv_program_guide_v1.0.pdf) — historical official corroboration that customers cannot edit final ASV reports; not used as a substitute for current passing criteria.
- [AWS EC2 Elastic IP addresses](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html) — confirms that a public IP address can be reassociated with a different instance.
- [Docker Scout image analysis](https://docs.docker.com/scout/explore/analysis/) — package inventory and vulnerability matching within container images support the distinction between application dependencies and host OS inspection.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link and its redirect.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged.
- FAQ 1152 supports combining scan evidence only where required coverage and remediation are demonstrated. The post correctly rejects incomplete scans and unresolved original findings as justification for this approach.
- FAQ 1597 supports the stated distinction between internal risk ranking and patch-release deadlines. The example September dates are explicitly illustrative and do not introduce a grace period.
- The asset identifiers, separate disclosure and detection dates, deployment records, and evidence index are practical implementation recommendations rather than a prescribed PCI SSC reporting schema.
- The fenced text block is an illustrative relationship map, not executable code or a configuration format. No runtime tests were applicable.
- All links in the post were reachable and pointed to the intended resources. The document-library URL is a landing page rather than a direct standard or program-guide download.
- Direct retrieval of the linked library's PCI DSS v4.0.1 and ASV Program Guide v4.0 Revision 2 PDFs was blocked by the document host/tool. Their full text was not independently reviewed. The current PCI SSC FAQs and official ASV resource announcement supplied the substantive requirements checked here; historical ASV text only corroborated the report-integrity principle.
- This review validates the guide's technical guidance, not the compliance of an actual scan population or evidence package.
