# Validation Summary: How to Scope a PCI DSS Penetration Test After a Significant Change

## Status
validated

## Post Type
Technical guide to penetration-test scoping and execution after significant changes. Although it contains no executable code, it includes technical implementation details about attack paths, trust boundaries, access controls, and segmentation testing, so a technical review was performed.

## Technologies Covered
- PCI DSS v4.0.1 and cardholder data environment (CDE) scoping.
- Internal and external penetration testing and vulnerability scanning.
- Network segmentation and isolation controls.
- Identity proxies, payment APIs, privileged access, and application dependencies.
- Test environments, remediation verification, and evidence retention.

## Sources Consulted
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — confirmed the cited destination and its listing of PCI DSS v4.0.1.
- [PCI DSS v4.0.1, Requirements and Testing Procedures](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf) — publisher download failed; reviewed the Council-authored June 2024 document through a [hosted copy](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf), especially Requirements 11.4.1–11.4.6, printed pages 274–280.
- [PCI SSC FAQ 1317: What is meant by significant change?](https://www.pcisecuritystandards.org/faqs/1317/) — checked the environment-dependent classification and supporting-infrastructure considerations.
- [PCI SSC Penetration Testing Guidance v1.1](https://listings.pcisecuritystandards.org/documents/Penetration-Testing-Guidance-v1_1.pdf) — checked scanning versus penetration testing, scope, critical systems, authentication, separate testing environments, tester independence, engagement planning, and reporting.
- [PCI DSS v4.0 SAQ D for Service Providers](https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf) — supplementary cross-check of testing frequency, qualifications, and remediation requirements; not used as a replacement for v4.0.1.

## Issues Found
No technical issues found.

The README.md was left unchanged.

## Review Notes
- Confirmed the annual and significant-change triggers for internal and external testing, the internal testing perspectives, tester independence, remediation and retesting, and the 12-month evidence-retention requirement.
- Confirmed that the six-month service-provider cadence refers to segmentation testing. Segmentation testing also follows changes to segmentation controls or methods; the trigger is not limited to significant changes.
- The change-focused scope remains subject to the documented methodology and annual coverage. It is not an unconditional exemption from broader testing. All segmentation controls and methods in use must be covered when applying Requirements 11.4.5 and 11.4.6.
- The attack-path block is an illustrative diagram, not executable code. There are no CLI commands, configuration schemas, or library APIs to execute or check for deprecation. The proxy examples are plausible security effects, not assertions about a specific product.
- The staging advice correctly requires production equivalence; evidence from different controls cannot establish production control effectiveness.
- The 2017 guidance predates v4.0.1 and uses older requirement numbers. It was used for testing practices only; version-specific obligations were checked against v4.0.1.
- The repeated document-library links point to the correct official resource. The author link is a plausible GitHub profile URL and is not a technical reference.
- This review checks the published guidance, not an actual deployment or completed penetration test.
