# Validation Summary: How to Share an RDS Snapshot Across AWS Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS DB snapshots
- AWS CLI for RDS
- AWS KMS
- AWS IAM key and identity policies
- Python boto3 for RDS automation
- AWS Lambda
- Amazon CloudWatch

## Sources Consulted
- Amazon RDS User Guide: Sharing a DB snapshot for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html
- Amazon RDS User Guide: Sharing encrypted snapshots for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/share-encrypted-snapshot.html
- Amazon RDS User Guide: Copying a DB snapshot for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- Amazon RDS User Guide: Encrypting Amazon RDS resources - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- AWS CLI Command Reference: rds modify-db-snapshot-attribute - https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-snapshot-attribute.html
- AWS CLI Command Reference: rds describe-db-snapshots - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-snapshots.html
- AWS CLI Command Reference: rds copy-db-snapshot - https://docs.aws.amazon.com/cli/latest/reference/rds/copy-db-snapshot.html
- AWS CLI Command Reference: rds restore-db-instance-from-db-snapshot - https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-from-db-snapshot.html
- AWS KMS Developer Guide: Allowing users in other accounts to use a KMS key - https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- Boto3 RDS client documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/rds.html

## Issues Found
- The KMS key policy example for encrypted snapshot sharing omitted several permissions required for encrypted RDS snapshot copy workflows, including encrypt, re-encrypt, data key, and grant management permissions. Updated the example action list to include the required KMS operations and added a note that the target account also needs IAM permissions delegating use of the key.
- The workaround for snapshots encrypted with the default AWS-managed `aws/rds` key incorrectly described restoring a new DB instance and then enabling encryption with a customer-managed key. RDS encryption keys cannot be changed on an existing encrypted DB instance; AWS documents the workaround as copying the snapshot and re-encrypting the copy with a customer-managed key before sharing it. Updated the numbered steps accordingly.

## Review Notes
The unencrypted sharing commands, snapshot attribute verification command, automated-to-manual copy command, shared snapshot restore command, and revoke-access command match current AWS CLI and Amazon RDS documentation. The automation Lambda is syntactically valid and uses current boto3 RDS client methods, but production automation should add handling for encrypted snapshots, name collisions on repeated runs, pagination, and snapshot status filtering.
