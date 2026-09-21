# Validation Summary: How to Use Regional KMS Keys for Backup Restore and Tenant Migration

## Status

validated

## Post Type

Technical guide with AWS CLI examples for inspecting KMS keys and copying encrypted RDS snapshots.

## Technologies Covered

- AWS Key Management Service (KMS), regional keys, multi-Region keys, aliases, rotation, and deletion
- Amazon RDS encrypted DB instances, snapshots, restores, and read replicas
- AWS IAM policies, KMS key policies, grants, and encryption contexts
- AWS CLI, Bash, and JMESPath
- Data residency, tenant migration, recovery testing, cutover, and rollback

## Sources Consulted

- [AWS KMS: How multi-Region keys work](https://docs.aws.amazon.com/kms/latest/developerguide/mrk-how-it-works.html)
- [AWS CLI: describe-key](https://docs.aws.amazon.com/cli/latest/reference/kms/describe-key.html)
- [Amazon RDS: Encrypting Amazon RDS resources](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html)
- [AWS CLI: copy-db-snapshot](https://docs.aws.amazon.com/cli/latest/reference/rds/copy-db-snapshot.html)
- [AWS CLI: db-snapshot-available waiter](https://docs.aws.amazon.com/cli/latest/reference/rds/wait/db-snapshot-available.html)
- [Amazon RDS: AWS KMS key management](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.Keys.html)
- [AWS KMS: Allowing users in other accounts to use a KMS key](https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html)
- [AWS KMS: Rotate AWS KMS keys](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html)
- [AWS KMS: Update aliases](https://docs.aws.amazon.com/kms/latest/developerguide/alias-update.html)
- [AWS KMS: Delete an AWS KMS key](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html)
- [AWS Prescriptive Guidance: Cutover stage](https://docs.aws.amazon.com/prescriptive-guidance/latest/best-practices-migration-cutover/cutover-stage.html)
- [AWS DMS: Using source filters](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.Filters.html)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed the existing README without modifying it. The post is technically relevant and contains implementation examples, so it qualifies for technical validation.
- Confirmed that related multi-Region keys share key material and key IDs while retaining regional ARNs and independent policies, grants, and aliases. Encryption at rest does not restrict where an authorized application sends decrypted data; the post correctly separates encryption from placement and egress controls.
- Verified all options in the three CLI commands. The DescribeKey response contains the fields selected by the JMESPath expression, and the expression correctly constructs a metadata object. MultiRegionConfiguration can be absent for a single-Region key, yielding null in this projection.
- Both Bash code blocks passed `bash -n`. Commands were checked against official AWS CLI documentation; no live AWS copy, restore, or authorization test was performed. Account IDs, key IDs, and snapshot names must refer to real accessible resources when running the examples.
- The snapshot-copy example is appropriate for an available snapshot in the same account and Region, with a usable destination encryption key. A shared manual source requires its snapshot ARN, and a cross-Region encrypted copy requires a key in the destination Region. The article explicitly directs readers to source-type and account-specific requirements.
- Confirmed that an existing encrypted RDS DB instance cannot change its KMS key in place, while a snapshot copy can use another key before restoration into a new instance. Same-Region encrypted read replicas must use the primary instance's key. CopyDBSnapshot copies the database snapshot and provides no tenant row filter.
- Verified that DescribeKey access and a direct Decrypt call do not establish RDS workflow authorization. RDS uses grants and encryption contexts; cross-account key access also requires the applicable key-policy and external-account IAM permissions.
- The snapshot waiter polls every 30 seconds and exits with code 255 after 60 unsuccessful checks. A long-running copy may require another wait or status check; the example does not promise unlimited waiting.
- Tenant selection, dependency preservation, isolated restore verification, write fencing or replication catch-up, and explicit reconciliation of post-cutover writes are sound operational guidance. The post does not claim that restoring an older snapshot recovers later destination writes.
- Verified the distinctions among rotation, alias reassignment, disabling, and deleting keys. Rotation does not re-encrypt existing data, alias reassignment changes the alias target, and deletion is irreversible. Keeping required key dependencies throughout backup retention is appropriate.
- All five AWS documentation links in the post resolved to the intended resources. The author link redirected to the expected GitHub profile. No deprecated commands or version-specific inaccuracies were identified.
