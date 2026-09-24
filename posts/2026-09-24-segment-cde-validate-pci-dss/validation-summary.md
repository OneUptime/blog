# Validation Summary: How to Segment the Cardholder Data Environment and Validate the Segmentation

## Status

validated

## Post Type

Technical guide. Although it contains no executable code, commands, or configuration snippets, it provides implementation and validation details for CDE boundaries, communication rules, administrative access, and segmentation testing.

## Technologies Covered

- PCI DSS v4.0.1 and cardholder data environment (CDE) scoping
- Network segmentation, VLANs, firewalls, and default-deny access rules
- Cloud identity and control-plane access, microsegmentation, and zero-trust architectures
- IPv6, VPNs, peering, and alternative network paths
- Segmentation penetration testing, vulnerability scanning, and compliance evidence

## Sources Consulted

- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/): verified that the linked library identifies PCI DSS v4.0.1 and its change summary.
- [PCI DSS v4.0.1, Requirements and Testing Procedures, June 2024](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf): checked requirements 1.3.1, 1.3.2, 11.4.5, 11.4.6, 12.5.2, and 12.5.2.1 using a [mirrored copy of the PCI SSC publication](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf). The official download returned HTTP 403 during review.
- [PCI SSC SAQ D for Service Providers, v4.0](https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf): corroborated the testing and scope-review requirements directly on the PCI SSC site; this older questionnaire was not treated as the current version.
- [PCI SSC: New Information Supplement—PCI DSS Scoping and Segmentation Guidance for Modern Network Architectures](https://blog.pcisecuritystandards.org/new-information-supplement-pci-dss-scoping-and-segmentation-guidance-for-modern-network-architectures): confirmed coverage of cloud, microsegmentation, zero trust, inventory, and scope verification. The announcement was accessible; its linked supplement download was not accessible through the browsing tool.
- [PCI SSC FAQ 1135: Can VLANs be used for network segmentation?](https://www.pcisecuritystandards.org/faqs/1135/): confirmed that segmentation depends on appropriate controls and configuration.
- [PCI SSC Guidance for PCI DSS Scoping and Network Segmentation, December 2016](https://www.pcisecuritystandards.org/documents/Guidance-PCI-DSS-Scoping-and-Segmentation_v1.pdf): checked foundational scoping principles, shared services, connected systems, and administrative access. Used for architectural principles rather than current requirement numbering.
- [Author GitHub profile](https://github.com/nawazdhandala): verified that the author link resolves to the intended profile.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The communication matrix and bypass-path examples are technically sound design and testing guidance, rather than a complete configuration for a specific platform.
- Confirmed the annual segmentation-testing minimum, the six-month service-provider minimum, and retesting after changes to segmentation controls or methods. The qualification and organizational-independence statements are accurate; QSA or ASV credentials are not mandatory for these tests.
- Confirmed that scope confirmation has its own annual or service-provider six-month cadence and significant-change trigger. Requirement 12.5.2.1 became mandatory after 31 March 2025, so its treatment as a requirement is appropriate for this post's date.
- Default-deny ingress and egress, review of administrative influence, testing from excluded environments, and positive connectivity checks are consistent with the cited requirements and scoping principles. A single TCP test or vulnerability scan does not establish complete segmentation effectiveness.
- The post's three technical reference links reach the intended PCI SSC pages. Download access restrictions encountered during review are documented above and were not treated as broken article links.
- No code execution or live penetration testing was applicable. This review validates the article's technical guidance, not any deployed environment or PCI DSS compliance status.
