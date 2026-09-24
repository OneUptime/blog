# Validation Summary: How to Store, Rotate, and Restrict Access to Card-Encryption Keys

## Status
validated

## Post Type
Technical guide. The post contains concrete key-storage, access-control, rotation, incident-response, and recovery guidance, plus an illustrative key-inventory record. It qualifies for technical review even though it contains no executable code.

## Technologies Covered
- PCI DSS v4.0.1 key-management requirements
- Envelope encryption, data-encryption keys, and key-encryption keys
- Hardware security modules (HSMs) and secure cryptographic devices
- AWS Key Management Service (KMS)
- Key policies, identity permissions, audit logging, and encrypted-backup recovery
- Split knowledge and dual control

## Sources Consulted
- [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/): verified that the linked library lists PCI DSS v4.0.1.
- [PCI DSS v4.0.1, Requirements and Testing Procedures](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf): official download was inaccessible during review; consulted the [reproduced PCI SSC document text](https://studylib.net/doc/27825883/pci-dss-v4-0-1), particularly requirements 3.6.1.2 and 3.7.4–3.7.6. This is a reproduction of the primary standard, not independent commentary.
- [PCI SSC SAQ D for Service Providers, v4.0](https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf): independently corroborated corresponding requirement language on the official host; this older questionnaire was not treated as the v4.0.1 standard.
- [AWS KMS: Rotate AWS KMS keys](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html).
- [AWS KMS cryptography essentials](https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html): envelope encryption and wrapped data-key storage.
- [AWS KMS keys](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html): key hierarchy, plaintext data keys, and historical key material.
- [AWS KMS: Default key policy](https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html): administrator versus user permissions and indirect privilege escalation.
- [AWS KMS: Logging API calls with CloudTrail](https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html).
- [AWS KMS: Delete an AWS KMS key](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html).
- [Author profile](https://github.com/nawazdhandala): verified the post's author URL redirects to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. No executable code, CLI commands, SDK APIs, or deployable configuration required execution testing. The fenced text is a documentation example, not a vendor configuration schema.
- Requirement 3.6.1.2 supports the described storage arrangements. Wrapping keys must be at least as strong as the protected keys and stored separately; component/share storage must follow an accepted method.
- Requirement 3.7.4 defines cryptoperiods by key type rather than prescribing a universal 90-day interval. Requirements 3.7.5 and 3.7.6 support the retirement, compromise-response, and manual cleartext handling guidance. Retained retired keys require secure archival, and splitting a key into two literal halves does not satisfy split knowledge.
- AWS confirms that KMS rotation neither rotates generated data keys nor re-encrypts existing data, and does not remediate data-key compromise. The post correctly distinguishes these operations.
- AWS documents both direct separation of administration from cryptographic use and the ability of policy administrators to grant additional permissions. The post correctly calls for reviewing indirect access paths.
- The HSM discussion correctly distinguishes protected service keys from data keys that may be returned in plaintext. The inventory, destruction-dependency checks, and recovery exercises are appropriate operational guidance; no live infrastructure or recovery exercise was performed for this editorial review.
- Logging recommendations are sound. For a future AWS implementation, account for CloudTrail's documented limits: denied cross-account requests are logged only in the caller account, and sensitive application data must not be placed in logged metadata.
- The PCI library and AWS links resolve to the intended resources. The official PCI PDF access limitation and the reproduction used for version-specific checking are documented above.
