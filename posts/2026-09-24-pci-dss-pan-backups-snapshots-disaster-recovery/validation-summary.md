# Validation Summary: How to Handle PAN in Backups, Snapshots, and Disaster-Recovery Copies

## Status

validated

## Post Type

Technical security and disaster-recovery guide. Although it contains no executable code, commands, or configuration snippets, it provides concrete implementation guidance for backup inventories, retention, immutable storage, encryption, and restoration controls, so a full technical review applies.

## Technologies Covered

- PCI DSS v4.0.1 and primary account number (PAN) protection
- Database snapshots, transaction logs, and point-in-time recovery
- Amazon S3 versioning, Object Lock, and replication
- Backup retention, immutable storage, and secure disposal
- Disk and partition encryption, key management, and access controls
- Offline backup media and disaster-recovery environments

## Sources Consulted

- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — confirmed the post links to the official library, which lists PCI DSS v4.0.1.
- [PCI DSS v4.0.1, Requirements and Testing Procedures](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf) — the official download returned HTTP 403. Reviewed the PCI SSC-authored June 2024 document through an [accessible mirrored copy](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf), especially Requirements 3.2.1, 3.5.1, 3.5.1.2, 9.4.1.1, and 9.4.1.2 and their guidance and applicability notes.
- [PCI SSC FAQ 1086: How does encrypted cardholder data impact PCI DSS scope?](https://www.pcisecuritystandards.org/faqs/1086/) — checked the encryption and scope claim.
- [AWS: Locking objects with Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html) — checked version-specific protection, compliance mode, and delete-marker behavior.
- [AWS: What does Amazon S3 replicate?](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-what-is-isnot-replicated.html) — checked that source deletion need not remove destination copies.
- [AWS: Deleting a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html) — checked that retained snapshots can survive source database deletion.
- [PostgreSQL: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html) — checked recovery from base backups and archived write-ahead logs.

## Issues Found

No technical issues found.

README.md was left unchanged.

## Review Notes

- Requirement 3.2.1 supports the stated retention, disposal, and three-month verification obligations; its guidance explicitly includes backups and archives. The 14-day example is appropriately identified as a business choice.
- Requirements 3.5.1 and 3.5.1.2 support the PAN-protection discussion, including the additional protection needed with disk encryption on non-removable media and the bulk-tape applicability note. The latter requirement became mandatory on 31 March 2025, before this post's date.
- Requirements 9.4.1.1 and 9.4.1.2 support secure offline backup storage and a security review at least every 12 months. Encryption alone does not automatically remove PCI DSS scope.
- Object Lock protects individual versions. A simple delete can succeed by adding a delete marker while leaving protected data recoverable. The post correctly separates a successful deletion request from evidence of disposal.
- Snapshot and log retention, cross-account copies, and restoration cleanup are valid recovery-lifecycle concerns. Delete propagation depends on the replication product and configuration; the inventory table describes a possible exposure rather than a universal replication rule.
- The post's inventory fields and post-restore sequence are operational recommendations, not a claim that PCI DSS prescribes that exact workflow. Scheduling source deletion before backups does not replace the separately described controls for older recoverable copies.
- The linked PCI SSC library and AWS documentation resolve to the intended resources. The author profile URL has a plausible GitHub profile format and is not a technical reference.
- No executable examples were present, so runtime tests were not applicable. This review validates the article's technical statements, not an organization's compliance implementation.
