# Validation Summary: How to Set Up S3 Same-Region Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3 Same-Region Replication
- Amazon S3 Batch Replication
- AWS IAM
- AWS CLI
- Amazon CloudWatch

## Sources Consulted
- Amazon S3 User Guide: Replicating objects within and across Regions - https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html
- Amazon S3 User Guide: Setting up live replication overview - https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-how-setup.html
- Amazon S3 User Guide: Replicating delete markers between buckets - https://docs.aws.amazon.com/AmazonS3/latest/userguide/delete-marker-replication.html
- AWS CLI Command Reference: put-bucket-replication - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- AWS CLI Command Reference: create-job - https://docs.aws.amazon.com/cli/latest/reference/s3control/create-job.html
- Amazon S3 User Guide: Configuring an IAM role for S3 Batch Replication - https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-batch-replication-policies.html
- Amazon S3 User Guide: Changing the replica owner - https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-change-owner.html
- Amazon S3 User Guide: Using S3 Replication metrics - https://docs.aws.amazon.com/AmazonS3/latest/userguide/repl-metrics.html
- Amazon S3 User Guide: Metrics and dimensions - https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html

## Issues Found
- The post described SRR as real-time and typically completed within seconds. AWS documents S3 replication as asynchronous, with predictable 15-minute replication requiring S3 Replication Time Control, so the wording was changed to describe SRR as asynchronous.
- The all-object replication examples used `"Filter": {}`. The current AWS CLI schema says a `Filter` must specify exactly one `Prefix`, `Tag`, or `And` child, so the examples now use `"Filter": { "Prefix": "" }`.
- The IAM policy for the replication role did not include `s3:ObjectOwnerOverrideToBucketOwner`, which is required when using the ownership override shown later in the cross-account example. The destination-object permissions now include that action.
- The S3 Batch Replication example used `SourceS3BucketArn`, omitted required `ManifestFormat`, and reused the live replication role ARN. The snippet now uses the current `SourceBucket` and `ManifestFormat` fields and references a separate S3 Batch Operations role.
- The CloudWatch metric example used `Average` for `OperationsPendingReplication`. AWS documents `Maximum` as the valid statistic for this replication metric, so the command now uses `--statistics Maximum`.
- The monitoring section implied replication metrics are always available. The comment now notes that S3 Replication metrics must be enabled.
- The conclusion referred to a real-time backup. This was changed to automatic, asynchronous backup to match S3 replication behavior.

## Review Notes
The AWS CLI is not installed in the local environment, so CLI validation was performed against the official AWS CLI command reference and Amazon S3 documentation rather than local `--help` output.
