# Validation Summary: How to Set Up ElastiCache Redis Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis OSS
- AWS CLI
- Amazon S3
- Amazon CloudWatch
- Terraform AWS provider
- AWS Lambda
- Python boto3

## Sources Consulted
- Amazon ElastiCache User Guide: Snapshot and restore - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups.html
- Amazon ElastiCache User Guide: Ensuring you have enough memory to make a Valkey or Redis OSS snapshot - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/BestPractices.BGSAVE.html
- Amazon ElastiCache User Guide: Exporting a backup - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups-exporting.html
- Amazon ElastiCache User Guide: Tutorial: Seeding a new node-based cluster with an externally created backup - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups-seeding-redis.html
- AWS CLI Command Reference: create-replication-group - https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- AWS CLI Command Reference: modify-replication-group - https://docs.aws.amazon.com/cli/latest/reference/elasticache/modify-replication-group.html
- AWS CLI Command Reference: describe-snapshots - https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-snapshots.html
- Boto3 ElastiCache create_snapshot documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/elasticache/client/create_snapshot.html
- Boto3 ElastiCache describe_snapshots documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/elasticache/client/describe_snapshots.html
- Boto3 ElastiCache DescribeSnapshots paginator documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/elasticache/paginator/DescribeSnapshots.html
- Amazon ElastiCache CloudWatch metrics for Valkey and Redis OSS - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Redis.html
- Terraform AWS provider aws_elasticache_replication_group documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group

## Issues Found
- The post described all backups as forking the Redis process. For Redis OSS 7.0 and modern ElastiCache behavior, AWS documents background save behavior and forkless save support rather than a universally forked process. Updated the explanation, diagram label, performance section, and recommendation wording to avoid the incorrect fork-specific claim.
- The snapshot status query labeled `NodeSnapshots[0].SnapshotCreateTime` as `DataSize`. Changed the label to `Created`.
- The S3 export bucket policy used the generic `elasticache.amazonaws.com` service principal and included `s3:PutObjectAcl`. AWS now documents the regional `elasticache-snapshot` service principal and multipart list permissions for snapshot export. Updated the policy for the example `us-east-1` bucket.
- The restore-from-S3 example used `my-snapshot-s3-export.rdb`, but ElastiCache appends an instance identifier and `.rdb` to exported backup objects. Added a note and updated the ARN example to `my-snapshot-s3-export-0001.rdb`.
- The Lambda cleanup example filtered Boto3 `describe_snapshots` with `SnapshotSource='manual'`. The request parameter expects `user` for manual snapshots, even though response values show `manual`. Updated the filter.
- The Lambda cleanup example did not paginate `describe_snapshots`, so it could miss older manual snapshots beyond the first response page. Updated it to use the Boto3 paginator.
- The Lambda cleanup example used naive local datetimes for snapshot naming and cutoff comparison. Updated it to use UTC-aware datetimes.

## Review Notes
AWS CLI was not installed in the local workspace, so CLI commands were verified against the official AWS CLI command reference rather than local `--help` output. The post still uses the older common phrase "ElastiCache Redis"; AWS documentation now generally uses "ElastiCache for Redis OSS" and also supports Valkey, but the `--engine redis` examples remain valid.
