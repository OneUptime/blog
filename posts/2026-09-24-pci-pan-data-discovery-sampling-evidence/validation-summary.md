# Validation Summary: How to Prove That Your Systems Do Not Store PAN with Data-Discovery Sampling

## Status
validated

## Post Type
Technical guide containing discovery implementation guidance and an illustrative YAML evidence manifest.

## Technologies Covered
- PCI DSS v4.0.1 scope confirmation and incident response
- Primary account number (PAN) discovery and Luhn candidate detection
- Storage inventories, parser coverage, and protected discovery evidence
- Representative sampling, stratification, and sampling limitations
- YAML evidence manifests

## Sources Consulted
- [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/) — verified the post's standard reference destination.
- [PCI DSS v4.0.1, Requirements and Testing Procedures, June 2024 (mirrored copy of the PCI SSC publication)](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf) — reviewed Section 6 and requirements 12.5.2 and 12.10.7. The Council's direct PDF endpoint returned HTTP 403, so the published standard was read through this mirror.
- [PCI SSC FAQ 1569: Is sampling allowed in PCI DSS v4.x?](https://www.pcisecuritystandards.org/faqs/1569/) — assessor sampling and representation of population variants.
- [Microsoft Purview credit card number entity definition](https://learn.microsoft.com/en-us/purview/sit-defn-credit-card-number) — Luhn checking, contextual detection, and exclusion of reserved test numbers.
- [Google Cloud Sensitive Data Protection: Inspect storage and databases](https://docs.cloud.google.com/sensitive-data-protection/docs/inspecting-storage) — access requirements, format handling, scan limits, sampling, and findings.
- [Google Cloud Sensitive Data Protection: Image inspection and redaction](https://docs.cloud.google.com/sensitive-data-protection/docs/concepts-image-redaction) — image text requires appropriate inspection capabilities.
- [Stripe testing documentation](https://docs.stripe.com/testing) — synthetic payment test data and isolated testing.
- [NIST: Choosing a Sampling Scheme](https://itl.nist.gov/div898/handbook/ppc/section3/ppc332.htm) — stratification, randomization, and systematic sampling errors.
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) — mappings, plain string scalars, and flow sequences.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves.

## Issues Found
- The detector-testing paragraph recommended synthetic payment test values without explaining that some detectors intentionally suppress reserved test numbers. Microsoft Purview documents this behavior. Updated the paragraph to require approved synthetic values the selected detector is documented to recognize and to confirm expected behavior before treating payment test numbers as positive controls. Added the official Microsoft reference. This prevents a valid exclusion from being misdiagnosed as detector failure.

## Review Notes
- Requirement 12.5.2 supports identifying account-data locations outside the expected CDE and in backups. Requirement 12.10.7 supports the stated investigation, disposition, and remediation steps for unexpected stored PAN.
- Assessor sampling does not permit partial implementation of required protections. The post correctly avoids treating discovery samples as proof of universal absence.
- The discovery schedule is operational guidance, not a replacement for scope-confirmation deadlines: at least annually and after significant changes, with the additional six-month requirement for service providers under 12.5.2.1.
- The YAML is an illustrative evidence schema, not a vendor configuration or PCI-mandated format. Parsed it successfully with PyYAML 6.0.2 and verified all three coverage categories contain lists.
- Reviewed the storage inventory, encryption/access gaps, candidate false positives, parser limitations, protected findings, historical sampling, and follow-up guidance. No further technical errors were identified.
- There are no executable commands, application APIs, or deployment instructions to run. No production data was scanned; this review validates the article, not an organization's absence of PAN.
- The title's strong wording is qualified immediately by the opening paragraph and consistently throughout the article. The existing structure and tone were preserved.
