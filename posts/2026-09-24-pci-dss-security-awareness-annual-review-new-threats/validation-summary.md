# Validation Summary: How to Review PCI DSS Security Awareness Training Annually for New Threats

## Status
not-code-blog

## Post Type
Compliance and security-awareness program guide.

## Technologies Covered
- PCI DSS v4.0.1 security-awareness requirements (12.6.2, 12.6.3, 12.6.3.1, and 12.6.3.2).
- Phishing and social-engineering awareness, with a reference to anti-phishing Requirement 5.4.1.
- Cardholder-data handling, acceptable use, role-specific training, and review evidence.

## Sources Consulted
- Local post: `posts/2026-09-24-pci-dss-security-awareness-annual-review-new-threats/README.md`.
- No external documentation was consulted. Step 1 instructs skipping technical verification for posts without code or technical implementation details. The PCI SSC document-library link in the post was not independently checked.

## Issues Found
No technical issues found during classification. A technical accuracy review was not performed, so this does not establish that the PCI DSS claims are correct. No changes were made to the post.

## Review Notes
The post describes administrative processes for reviewing security-awareness training, mapping threats to lessons, documenting delivery, and retaining evidence. It contains no executable code, terminal commands, configuration snippets, or technical implementation instructions. References to security controls and example training scenarios do not constitute implementation details.

Per Step 1, the post was classified as `not-code-blog` and Steps 2 and 3 were skipped. Requirement wording, version currency, and external links were not independently verified. The classification does not imply the post is unsuitable for the blog.

## Follow-up Source Verification — 2026-09-24

This separate review checks the substantive PCI DSS claims omitted by the initial classification-only review above. The `not-code-blog` classification is unchanged.

The following claims agree with PCI SSC's v4.0.1 standard text, retrieved from a public mirror and corroborated against PCI SSC's own hosted v4.0 SAQ D for Service Providers:

- Requirement 12.6.2 calls for reviewing the awareness program at intervals no longer than 12 months and updating it when relevant threats, vulnerabilities, or personnel guidance require changes.
- Requirement 12.6.3 distinguishes training at hire and every 12 months, varied communication methods, and personnel's yearly acknowledgement of security policies and procedures.
- Requirements 12.6.3.1 and 12.6.3.2 cover phishing, social engineering, and acceptable use of end-user technologies.
- Requirement 5.4.1's applicability notes explicitly separate technical anti-phishing controls from awareness training; satisfying either does not satisfy the other.
- The relevant future-dated awareness requirements became mandatory on 31 March 2025, before this article's publication date.

The official document library currently lists v4.0.1. PCI SSC's release announcement confirms it was a limited revision without added or removed requirements and retained the March 2025 effective date. The article's recommendations for review packets, synthetic exercises, and evidence mapping are presented as practical methods rather than additional mandatory controls. No concrete factual error was identified, and no README changes were made in this follow-up.

### Follow-up Sources Consulted

- [PCI SSC: PCI DSS v4.0.1 Requirements and Testing Procedures, June 2024 — public mirror](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf), printed pages 132 and 310–313, for the current wording of Requirements 5.4.1 and 12.6.2–12.6.3.2.
- [PCI SSC: PCI DSS v4.0 SAQ D for Service Providers](https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf), printed pages 47 and 117–119, for Requirements 5.4.1 and 12.6.
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/), to check the currently listed standard.
- [PCI SSC: Just Published — PCI DSS v4.0.1](https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1), for revision scope and effective-date continuity.

### Retrieval Note

The [canonical v4.0.1 standard PDF](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf) returned HTTP 403 through both the browser fetch tool and a direct HTTP request. The mirror listed above was subsequently downloaded successfully and its text extracted with `pdftotext`; the relevant v4.0.1 sections were read directly. This is the PCI-authored standard hosted by a third party, rather than a third-party interpretation. The official document library and release announcement were consulted separately to corroborate the document version and publication context.
