# How to Handle PAN in Backups, Snapshots, and Disaster-Recovery Copies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security, Backup, Disaster Recovery

Description: Inventory and protect every backup containing PAN, reconcile immutable retention with deletion, and prevent restores from reviving expired card data.

---

Deleting a primary account number (PAN) from a payment database does not delete yesterday's snapshot. Replication, transaction logs, backup exports, and disaster-recovery exercises can preserve the same data long after its operational purpose ends.

Handle those copies as part of the cardholder-data lifecycle. Start with what can be recovered, then work backward to encryption, access, retention, and restoration controls.

## Build a recovery-copy inventory

For each production store, trace both automatic and manual copying paths. Include database snapshots, write-ahead or transaction logs, filesystem snapshots, virtual-machine images, cross-region replication, offline media, and temporary files produced by backup agents.

Record a durable identifier for each backup family, its owner, source, destinations, encryption method, key owner, retention period, restore permissions, and deletion mechanism. Avoid putting actual PAN into the inventory.

| Copy family | Often-missed exposure | Useful evidence |
|---|---|---|
| Database snapshots | Old snapshots survive database deletion | Snapshot inventory and expiration records |
| Transaction-log archives | PAN remains recoverable between snapshots | Archive retention and restore-window settings |
| Cross-account copies | Source deletion does not remove destination copies | Destination owner and lifecycle policy |
| Disaster-recovery restores | Old data becomes active again | Restore approval and cleanup results |

Distinguish recovery-point objectives from data-retention justification. Wanting a long recovery window does not, by itself, explain why full PAN must remain in every backup.

## Define retention for the copies themselves

PCI DSS v4.0.1 Requirement 3.2.1 covers all stored account-data locations and requires documented retention needs, secure disposal, and verification at least once every three months that expired data has been removed or made unrecoverable. Backup and archive systems are specifically discussed in its guidance. Use the current [PCI DSS standard](https://www.pcisecuritystandards.org/document_library/) when mapping your policy.

For example, an operational design might retain daily backups for 14 days and retain longer-lived financial records after PAN has been removed. Those are example business decisions, not PCI-mandated periods.

Define how age is calculated. A newly created snapshot can contain very old records. A policy based only on snapshot creation time can therefore retain a PAN longer than the record-level policy permits. Make the maximum recoverable age explicit, reconcile it with legitimate retention needs, and ensure source-data deletion jobs execute before the relevant backup runs.

Keep deletion verification separate from backup-job success. A successful upload says nothing about expired versions or abandoned disaster-recovery copies.

## Resolve immutability before enabling it

Immutable backups can protect against ransomware, but an overlong lock can obstruct required disposal. Partition backup families by retention needs and exclude unnecessary account data before it enters locked storage.

For Amazon S3, Object Lock applies to individual object versions. Compliance-mode protection prevents deletion during the lock period, while a simple object deletion can merely create a delete marker and leave the protected version intact. Review AWS's [Object Lock behavior](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html) before treating a successful delete request as proof of disposal.

Do not shorten business retention on paper while leaving immutable copies recoverable for years. Resolve the architecture and any applicable legal retention obligations with the people responsible for the data.

## Protect recoverability and decryption separately

Backups containing PAN still need an appropriate method of rendering PAN unreadable under Requirement 3.5.1. Encryption does not automatically remove the environment from PCI scope.

Document which identities can read backup objects, restore databases, use decryption keys, change retention, and grant those permissions to others. Separate routine backup creation from restoration and key administration where practical. Alert on unexpected restores, exports, or key-policy changes without recording PAN in alert payloads.

Review Requirement 3.5.1.2 carefully if your protection is disk or partition encryption: non-removable media needs another qualifying PAN-protection mechanism. Its applicability notes treat media within a data-center architecture, including bulk tape backups, as non-removable for this purpose.

Offline media also has physical requirements. Requirements 9.4.1.1 and 9.4.1.2 call for secure storage and a review of the security of those storage locations at least every 12 months. Keep these records alongside logical-access evidence.

## Make restoration a controlled data event

A restore should identify the requested recovery point, destination, approver, permitted operators, and intended disposal date. Establish the destination's access controls, logging, encryption, and network restrictions before restoring account data.

Then run a documented post-restore sequence:

1. Determine whether restored records exceed their approved retention period.
2. Apply deletion or sanitization before releasing the restored system for routine use.
3. Verify the application's backup jobs will not recopy data scheduled for disposal.
4. Remove temporary exports, detached disks, and failed restore attempts.
5. Record completion using object identifiers and counts, without copying sensitive data into evidence.

Test recovery using representative synthetic data whenever possible. When a genuine recovery requires production PAN, keep the recovery environment within the assessed controls. A backup is properly managed only when both restoring needed data and disposing of unneeded data work as designed.
