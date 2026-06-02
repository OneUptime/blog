# Validation Summary: How to Set Up S3 Replication Time Control (RTC) for Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 Replication
- S3 Replication Time Control (RTC)
- AWS CLI
- AWS Identity and Access Management (IAM)
- AWS Key Management Service (AWS KMS)
- Amazon CloudWatch metrics, alarms, and dashboards
- Amazon S3 Event Notifications

## Sources Consulted
- Amazon S3 User Guide: Meeting compliance requirements with S3 Replication Time Control: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html
- Amazon S3 User Guide: Replicating objects within and across Regions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html
- Amazon S3 User Guide: S3 Replication metrics in CloudWatch and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Amazon S3 User Guide: Using S3 Replication metrics: https://docs.aws.amazon.com/AmazonS3/latest/userguide/repl-metrics.html
- Amazon S3 User Guide: Replicating encrypted objects with SSE-KMS: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
- AWS CLI Command Reference: put-bucket-replication: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- AWS S3 Replication Time Control SLA: https://aws.amazon.com/s3/features/replication/sla/
- Amazon S3 FAQs: S3 Replication Time Control: https://aws.amazon.com/s3/faqs/

## Issues Found
- The post described RTC as guaranteeing that 99.99% of objects replicate within 15 minutes. AWS describes RTC as designed for 99.99% within 15 minutes, while the SLA commitment is 99.9% during a monthly billing cycle. Updated the description, introduction, and RTC benefits list to distinguish the design target from the SLA commitment.
- The monitoring section said RTC provides three CloudWatch metrics. AWS documentation lists four S3 Replication metrics: `ReplicationLatency`, `BytesPendingReplication`, `OperationsPendingReplication`, and `OperationsFailedReplication`. Added the failed operations metric to the monitoring examples and dashboard.
- The CloudWatch examples did not specify the destination bucket Region. AWS publishes S3 Replication metrics in the destination Region, so the examples now include `--region eu-west-1`.
- CloudWatch alarm examples did not set missing data treatment. AWS recommends treating missing replication metric data as ignore, so `--treat-missing-data ignore` was added to the alarm examples.
- The dashboard used `Average` for `ReplicationLatency`, but AWS lists `Maximum`/`Max` as the valid statistic for that metric. Removed the average series.
- The KMS permissions example was not valid JSON because it showed two policy statements without a surrounding policy document. Wrapped the statements in a valid IAM policy document.
- The compliance reporting wording implied CloudWatch metrics alone prove that 99.99% of objects replicated within 15 minutes. Reworded it to focus on replication latency and missed or failed replication operations.

## Review Notes
- AWS CLI was not installed in this workspace, so command verification was performed against official AWS CLI and Amazon S3 documentation rather than local `aws --help` output.
- The examples assume the source bucket is in `us-east-1`, the destination bucket is in `eu-west-1`, and the placeholder account, bucket, role, SNS topic, and KMS key identifiers are replaced before use.
