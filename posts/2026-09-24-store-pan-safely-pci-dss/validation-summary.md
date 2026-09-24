# Validation Summary: How to Store a PAN Safely When Business Requirements Make It Unavoidable

## Status
validated

## Post Type
Technical security architecture guide. The post includes vault API pseudocode and implementation guidance for PAN storage, encryption, authorization, and retention, so it qualifies for technical review despite having no executable program.

## Technologies Covered
- PCI DSS v4.0.1 and primary account number (PAN) storage
- Cardholder data and sensitive authentication data
- Tokenization, truncation, and display masking
- Data-level and envelope encryption; cryptographic key management
- Vault APIs, service identities, authorization, and audit logging
- Retention, secure deletion, replicas, caches, and backup recovery

## Sources Consulted
- [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/) — verified the post links to the official standards library.
- [PCI DSS v4.0.1, Requirements and Testing Procedures, June 2024](https://issues.redhat.com/secure/attachment/13274529/PCI-DSS-v4_0_1.pdf) — PCI SSC-authored standard accessed through a Red Hat-hosted copy because the direct PCI SSC PDF endpoint returned HTTP 403. Reviewed scope, data classification, and relevant provisions of Requirements 3, 7, and 10.
- [PCI SSC FAQ 1318: Maximum storage period for cardholder data](https://www.pcisecuritystandards.org/faqs/1318/) — retention, disposal, and the post-authorization SAD prohibition.
- [PCI SSC FAQ 1086: Encrypted cardholder data and PCI DSS scope](https://www.pcisecuritystandards.org/faqs/1086/) — encryption alone does not remove data from scope.
- [PCI SSC FAQ 1492: PAN masking and truncation with 8-digit BINs](https://www.pcisecuritystandards.org/faqs/1492/) — display limits and documented business justification.
- [PCI SSC v4.0 SAQ D for Service Providers](https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf) — supplemental cross-check of encryption and key controls; version-specific conclusions were checked against v4.0.1.
- [Google Cloud KMS: Envelope encryption](https://docs.cloud.google.com/kms/docs/envelope-encryption) — wrapped data keys, separate wrapping-key management, and encryption/decryption flow.

## Issues Found
No technical issues found.

The README was left unchanged.

## Review Notes
- The three API signatures are explicitly illustrative text, not executable code or a claimed vendor API. Their inputs and outputs are coherent with the proposed narrow vault interface. There are no CLI commands, configuration formats, dependencies, or deprecated APIs to test.
- Confirmed the distinction between PAN and prohibited post-authorization authentication data, including the limited issuing exception. Requirements 3.5.1 and 3.5.1.2 support the stored-PAN and non-removable-media guidance; Requirement 3.6 supports key protection and separation.
- The envelope-encryption description correctly stores ciphertext with a wrapped data key and preserves implementation-dependent metadata. A concrete implementation still needs the encryption library's complete ciphertext format and authenticated-context handling.
- Last-four display is a conservative policy. PCI DSS generally allows BIN plus last four; displaying additional digits requires a legitimate business need. Masking and stored-data protection are separate controls.
- Retention must cover every storage location. Protecting backups does not exempt expired records from disposal. Requirement 3.2.1 also requires checking for overdue data at least every three months. Key lifecycle controls are covered by Requirement 3.7, including secure archival and prohibiting encryption with retired keys.
- The disk-encryption restriction became mandatory on 31 March 2025, so treating it as applicable on the requested validation date is correct.
- Business-operation APIs, schema restrictions, server-side authorization, and negative tests are reasonable design recommendations. This review validates the article's guidance; no deployed vault or recovery process was available for runtime testing. The post appropriately calls for review against all applicable requirements.
