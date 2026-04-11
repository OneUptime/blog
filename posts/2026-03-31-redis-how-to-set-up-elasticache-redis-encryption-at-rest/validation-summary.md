# Validation Summary: How to Set Up ElastiCache Redis Encryption at Rest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis
- AWS KMS (Key Management Service)
- AWS CLI (`elasticache`, `kms`, `logs` subcommands)
- Terraform AWS Provider (`aws_kms_key`, `aws_kms_alias`, `aws_elasticache_replication_group`)
- AWS CloudTrail / CloudWatch Logs
- Compliance frameworks (PCI-DSS, HIPAA, SOC 2)

## Sources Consulted
- AWS ElastiCache At-Rest Encryption documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/at-rest-encryption.html
- AWS ElastiCache API Reference — Snapshot data type: https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_Snapshot.html
- AWS ElastiCache API Reference — ReplicationGroup data type: https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_ReplicationGroup.html
- AWS ElastiCache API Reference — CreateReplicationGroup: https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_CreateReplicationGroup.html
- AWS ElastiCache API Reference — CopySnapshot: https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_CopySnapshot.html
- AWS KMS documentation for key policies and key rotation
- Terraform AWS Provider documentation for `aws_elasticache_replication_group` and `aws_kms_key`

## Issues Found

### Issue 1: Incorrect claim about EBS volumes
- **What was wrong:** The post stated encryption at rest covers "Data stored on the underlying EBS volumes of cache nodes." ElastiCache is a managed service and does not expose or use EBS volumes for its cache nodes. The AWS documentation describes encryption at rest as covering "disk during sync, backup and swap operations" and "backups stored in Amazon S3."
- **What was changed:** Replaced "Data stored on the underlying EBS volumes of cache nodes" with "Backups stored in Amazon S3" to match AWS documentation.
- **Why:** The original claim was technically incorrect and could mislead readers about ElastiCache's storage architecture.

### Issue 2: Non-existent `EncryptionEnabled` field on Snapshot object
- **What was wrong:** The `describe-snapshots` JMESPath query referenced `EncryptionEnabled` as a field on the Snapshot object (`Snapshots[0].{Encrypted:EncryptionEnabled,KMSKey:KmsKeyId}`). The ElastiCache Snapshot data type does not have an `EncryptionEnabled` field. The only encryption-related field is `KmsKeyId` — its presence indicates the snapshot is encrypted.
- **What was changed:** Simplified the query to `Snapshots[0].KmsKeyId` and added a comment clarifying that KmsKeyId presence confirms encryption.
- **Why:** The original query would return `null` for the `Encrypted` alias, which is misleading and confusing for readers trying to verify their setup.

### Issue 3: Misleading comment in migration steps
- **What was wrong:** Step 1 of the migration section had the comment "Create an encrypted snapshot of the unencrypted cluster." At this step, the snapshot is NOT encrypted — it's a plain snapshot of the unencrypted cluster. Encryption only happens in Step 2 when `copy-snapshot` is called with `--kms-key-id`.
- **What was changed:** Changed the comment to "Create a snapshot of the unencrypted cluster" (removed "encrypted").
- **Why:** The original comment contradicted the actual workflow and could confuse readers about when encryption is applied.

## Review Notes
- The migration workflow's Step 2 (`copy-snapshot --kms-key-id`) is the documented way to encrypt a snapshot copy, though AWS documentation does not explicitly confirm this works for encrypting a previously unencrypted snapshot. This is a commonly described pattern in AWS guides but readers should test in their environment.
- The `--engine redis` flag is included in the first CLI example but omitted in the second. While `redis` is the default engine for `create-replication-group`, including it explicitly in both examples would improve clarity for tutorial readers.
- The compliance section (PCI-DSS, HIPAA, SOC 2) provides reasonable high-level mappings but is simplified. PCI-DSS Requirement 3.5 specifically covers protecting cryptographic keys; the encryption requirement itself maps more precisely to Requirement 3.4 (render PAN unreadable). This is acceptable for a blog overview but should not be treated as compliance guidance.
- The KMS key policy in the Terraform block grants `kms:Decrypt` and `kms:GenerateDataKey` to ElastiCache, while the best practices JSON section also adds `kms:DescribeKey` and condition keys. The Terraform policy could benefit from the same conditions, but this is a best-practice suggestion rather than a correctness issue.
