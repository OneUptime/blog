# Validation Summary: How to Keep PCI DSS Audit Logs Available Across SIEM and Separate Archive Storage

## Status
validated

## Post Type
Technical architecture and operational validation guide. Although it contains no executable code, it provides implementation details for retention boundaries, archive retrieval, access controls, integrity, and retrieval testing, so it qualifies for technical review.

## Technologies Covered
- PCI DSS v4.0.1 audit logging and retention requirements
- Security information and event management (SIEM) systems
- Amazon S3, S3 Glacier Flexible Retrieval, and S3 Glacier Deep Archive
- Object-storage lifecycle policies and immutable storage
- Encryption-key management and AWS KMS
- Log collection, parsing, integrity checks, and recovery testing

## Sources Consulted
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — verified the post's standards reference destination.
- [PCI DSS v4.0.1 Requirements and Testing Procedures, June 2024](https://commerce.uwo.ca/pdf/PCI-DSS-v4_0_1-2.pdf) — PCI SSC-authored standard hosted by Western University; examined Requirements 10.2.2, 10.3.1–10.3.4, and 10.5.1 and their guidance. The PCI SSC PDF download endpoint returned HTTP 403, so this hosted copy of the primary document was used.
- [PCI SSC FAQ 1533: Sensitive authentication data after authorization](https://www.pcisecuritystandards.org/faqs/1533/) — checked the warning that log retention does not permit otherwise prohibited payment-data storage.
- [Amazon S3: Restoring an archived object](https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects.html) — verified the post's AWS link and restoration requirements.
- [Amazon S3: Understanding archive retrieval options](https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html) — checked the distinction between instant access and restoration-based storage classes.
- [Amazon S3: Lifecycle configuration elements](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html) — checked age-based lifecycle behavior and retention-boundary considerations.
- [Amazon S3: Locking objects with Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html) — checked the integrity and deletion-protection discussion.
- [AWS KMS: Delete an AWS KMS key](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html) — checked the consequences of losing decryption keys and closing accounts.
- [AWS KMS: Rotate AWS KMS keys](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html) — checked the distinction between rotation and key deletion.

## Issues Found
No technical issues found.

## Review Notes
- Requirement 10.5.1 specifies at least twelve months of audit history and immediate availability of the latest three months. Its guidance permits multiple storage/recovery approaches without prescribing a universal numerical retrieval SLA or a particular SIEM product.
- The summary of Requirement 10.3 correctly covers restricted access, modification protection, prompt protected backups, and change-detection alerts. Required event details under 10.2.2 support preserving timestamps and source identity.
- A fixed ninety-day window can be shorter than three calendar months; the recommendation to configure a margin is sound.
- S3 Glacier Flexible Retrieval and Deep Archive require restoration. S3 Glacier Instant Retrieval is a distinct class; the post correctly avoids claiming all Glacier storage requires restoration.
- Permanently losing the necessary decryption key can make retained ciphertext unusable. Normal AWS KMS automatic rotation preserves earlier key material for decryption; the post recommends testing changes without claiming rotation itself destroys access.
- Overlapping retention, reconciliation, parser preservation, and analyst retrieval exercises are engineering recommendations, not additional explicitly mandated PCI DSS procedures. Counts or checksums alone do not establish semantic completeness after transformations.
- No executable code, CLI commands, or configuration syntax required runtime testing. The text block is an evidence checklist. No deployed logging environment was supplied, so this review validates the guidance rather than actual operational compliance.
- README.md was left unchanged. The PCI SSC and AWS documentation links point to appropriate resources; the author link is not a technical source.
