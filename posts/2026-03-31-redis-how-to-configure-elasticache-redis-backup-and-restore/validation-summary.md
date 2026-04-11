# Validation Summary: How to Configure ElastiCache Redis Backup and Restore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis
- AWS CLI (elasticache commands)
- Terraform (aws_elasticache_replication_group resource)
- Python / boto3 (ElastiCache client)
- Amazon S3 (snapshot storage and export)
- AWS KMS (encryption for cross-region copies)

## Sources Consulted
- AWS ElastiCache documentation: Backup and Restore for ElastiCache for Redis (https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/backups.html)
- AWS CLI reference: elasticache copy-snapshot (https://docs.aws.amazon.com/cli/latest/reference/elasticache/copy-snapshot.html)
- AWS CLI reference: elasticache create-snapshot (https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-snapshot.html)
- AWS CLI reference: elasticache modify-replication-group (https://docs.aws.amazon.com/cli/latest/reference/elasticache/modify-replication-group.html)
- AWS CLI reference: elasticache create-replication-group (https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html)
- Terraform AWS Provider: aws_elasticache_replication_group (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group)
- boto3 ElastiCache client reference: describe_snapshots (https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/elasticache/client/describe_snapshots.html)

## Issues Found

1. **Automatic snapshots triggered during "maintenance window" (line 15)**: The post stated automatic snapshots are "triggered during a configured maintenance window." Automatic snapshots are triggered during the **backup window** (snapshot window), not the maintenance window. The maintenance window is for patching and node replacements. Fixed to say "backup window."

2. **Snapshot status `deleted` (line 78)**: The post listed `deleted` as a snapshot status. The actual status when a snapshot is being removed is `deleting`; once deletion completes, the snapshot is removed from listings entirely. There is no persistent `deleted` status. Fixed to `deleting`.

3. **Cross-region copy-snapshot commands (lines 127-140)**: Two issues:
   - Used `--source-region us-east-1` which is not a valid parameter for `aws elasticache copy-snapshot`. Cross-region copies require the source snapshot's full ARN in `--source-snapshot-name`, with `--region` set to the target region.
   - Included `--target-bucket ""` (empty string) which is unnecessary and confusing when not exporting to S3; the parameter should be omitted entirely.
   - Fixed both commands to use the full ARN format for `--source-snapshot-name` and removed the invalid parameters.

4. **Unused `timedelta` import (line 179)**: The Python script imported `timedelta` from `datetime` but never used it. Removed the unused import.

## Review Notes
- The pricing information in the "Backup Retention and Cost" section is presented as approximate with `~` prefixes, which is appropriate since AWS pricing changes over time. Readers should verify current pricing on the AWS pricing page.
- The post correctly emphasizes that restoring always creates a new cluster (no in-place restore), which is an important operational detail.
- The Python backup verification script is well-structured and handles timezone-aware datetime comparison correctly using `datetime.now(created_at.tzinfo)`.
- The S3 export path `s3://my-redis-backup-bucket/elasticache/redis/` shown in the export section is illustrative; the actual path structure may vary.
