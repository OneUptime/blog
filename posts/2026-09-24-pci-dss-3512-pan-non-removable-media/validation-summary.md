# Validation Summary: PCI DSS 4.0.1 Requirement 3.5.1.2: PAN on Non-Removable Media

## Status

validated

## Post Type

Technical security implementation guide. Although it contains no executable code, commands, or configuration snippets, it describes encryption boundaries, service responsibilities, authorization, key management, and concrete validation procedures, so it qualifies for technical review.

## Technologies Covered

- PCI DSS v4.0.1, particularly Requirements 3.5.1, 3.5.1.2, 3.5.1.3, 3.6, and 3.7.
- Primary account number (PAN) storage protection.
- Disk, partition, file, column, and field encryption.
- Truncation and tokenization.
- Cryptographic key management and decryption authorization.
- Database backups, exports, logs, and persistent copies.

## Sources Consulted

- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/): verified that the post links to the correct official library and that it lists PCI DSS v4.0.1.
- PCI SSC, *PCI DSS Requirements and Testing Procedures*, v4.0.1, June 2024, Requirements 3.5–3.7, especially printed pages 93–95 and 105. The [official PDF endpoint](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf) returned HTTP 403. Reviewed the Council-authored document using this [externally hosted PDF copy](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf).
- [PCI SSC FAQ 1492](https://www.pcisecuritystandards.org/faqs/1492/): storage protection methods and the distinction between masking and truncation.
- [PCI SSC FAQ 1086](https://www.pcisecuritystandards.org/faqs/1086/): encryption and PCI DSS scope.
- [Microsoft Learn: Transparent data encryption for Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-tde-overview?view=azuresql): automatic storage decryption and the absence of TDE protection in exported BACPAC content.
- [Author GitHub profile](https://github.com/nawazdhandala): verified the post's author link resolves to the intended profile.

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- Confirmed the requirement for an additional PAN-unreadability mechanism when disk or partition encryption protects non-removable media, including the applicability notes covering automatic clear-text exposure and data-center media.
- Confirmed the 31 March 2025 effective date and the limited exception for issuers and supporting issuing services accessing PAN for real-time transaction processing. Other stored uses remain covered.
- Confirmed the separate authentication/access controls, decryption-key restrictions, and secure authentication-factor storage described by Requirement 3.5.1.3.
- The key-management discussion correctly refers to Requirements 3.6 and 3.7. Retained retired keys require secure archival and must not be used for new encryption operations.
- The service separation and identity-specific tests are reasonable implementation recommendations, rather than a claim that PCI DSS mandates this exact architecture. No deployed environment was assessed.
- The warning about exports is supported by Microsoft's documented BACPAC behavior. Export protection depends on the encryption layer and tool; the post appropriately says that some tools expose logical clear-text values.
- Truncation and tokenization are presented conditionally, without claiming that either automatically eliminates all PCI DSS obligations. Encryption alone does not remove cardholder data from scope.
- No executable examples were present, so runtime, CLI, API, and configuration testing were not applicable. Source access limitations are documented above.
