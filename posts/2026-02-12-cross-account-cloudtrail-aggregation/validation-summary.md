# Validation Summary: How to Set Up Cross-Account CloudTrail Aggregation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudTrail
- AWS Organizations
- Amazon S3
- AWS KMS
- Amazon CloudWatch Logs
- Amazon Athena
- AWS CLI
- S3 Lifecycle configuration

## Sources Consulted
- AWS CloudTrail: Creating a trail for an organization with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-an-organizational-trail-by-using-the-aws-cli.html
- AWS CloudTrail: Sending events to CloudWatch Logs - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html
- AWS CloudTrail: Role policy document for CloudTrail to use CloudWatch Logs for monitoring - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cw_role_policy.html
- AWS CloudTrail API Reference: GetTrailStatus - https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_GetTrailStatus.html
- AWS CloudTrail: Troubleshooting issues with an organization trail - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-troubleshooting.html
- AWS KMS Developer Guide: How AWS CloudTrail uses AWS KMS - https://docs.aws.amazon.com/kms/latest/developerguide/services-cloudtrail.html
- AWS CloudTrail: Configure AWS KMS key policies for CloudTrail - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
- Amazon Athena: Create a table for CloudTrail logs using manual partitioning - https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table.html
- Amazon Athena: Create a table for an organization wide trail using manual partitioning - https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table-org-wide-trail.html
- AWS CLI Command Reference: cloudtrail create-trail - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/create-trail.html
- AWS CLI Command Reference: s3api put-bucket-encryption - https://docs.aws.amazon.com/cli/v1/reference/s3api/put-bucket-encryption.html
- AWS CLI Command Reference: s3api put-bucket-versioning - https://docs.aws.amazon.com/cli/v1/reference/s3api/put-bucket-versioning.html
- AWS CLI Command Reference: s3api put-bucket-lifecycle-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- OneUptime product site - https://oneuptime.com/
- Related OneUptime blog link - https://oneuptime.com/blog/post/2026-02-12-aws-config-multi-account-multi-region-data-aggregation/view

## Issues Found
- The CloudWatch Logs IAM policy used a log group ARN wildcard (`log-group:CloudTrail/Logs:*`) for `logs:CreateLogStream` and `logs:PutLogEvents`. AWS documents these permissions against log stream ARNs. Updated the policy to use `log-group:CloudTrail/Logs:log-stream:...` resources for both the account trail stream prefix and organization trail stream prefix.
- The Athena table definition omitted the CloudTrail-specific input and output formats. CloudTrail log files contain records inside the `Records` array, so AWS's documented table uses `com.amazon.emr.cloudtrail.CloudTrailInputFormat`. Added the documented input and output formats.
- The Athena organization-wide table location pointed at `s3://.../AWSLogs/`, which is too broad for the organization trail layout shown in the post. Updated it to `s3://org-cloudtrail-logs-central/AWSLogs/o-exampleorgid/`.
- The Athena table schema was missing newer documented CloudTrail fields and used outdated/case-mixed field names in several places. Updated the schema to align with the current AWS Athena CloudTrail example.
- The monitoring example claimed to create a CloudWatch metric filter for trail delivery errors, but the filter only matched CloudTrail event records with `TrailNotFoundException` and would not detect S3 or CloudWatch Logs delivery failures. Replaced it with the documented `aws cloudtrail get-trail-status` check and named the relevant status fields.

## Review Notes
- The KMS examples assume the referenced KMS key and alias already exist and that the KMS key policy allows CloudTrail to use `kms:GenerateDataKey*` and `kms:DescribeKey`. The post now remains technically correct, but a future expansion could include a full KMS key policy example.
- The individual-account S3 bucket policy is functional but would be stronger with `aws:SourceArn` conditions for each trail, matching AWS's current security best-practice guidance.
- Athena manual partitioning can become operationally heavy in large organizations. AWS notes that CloudTrail Lake can reduce that partition-maintenance burden.
