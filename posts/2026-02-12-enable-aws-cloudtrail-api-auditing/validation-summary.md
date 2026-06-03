# Validation Summary: How to Enable AWS CloudTrail for API Auditing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudTrail
- AWS CLI
- Amazon S3 bucket policies, versioning, public access blocks, and lifecycle rules
- Amazon CloudWatch Logs metric filters and alarms
- AWS IAM roles and policies
- Amazon Athena SQL over CloudTrail logs
- Service Control Policies / IAM deny policies

## Sources Consulted
- AWS CloudTrail User Guide: Working with CloudTrail event history - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html
- AWS CloudTrail User Guide: Creating a trail for your AWS account - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html
- AWS CloudTrail User Guide: Amazon S3 bucket policy for CloudTrail - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CLI Command Reference: cloudtrail put-event-selectors - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/put-event-selectors.html
- AWS CloudTrail User Guide: Validating CloudTrail log file integrity with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-cli.html
- Amazon Athena User Guide: Create a table for CloudTrail logs in Athena using manual partitioning - https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table.html
- AWS CloudTrail pricing - https://aws.amazon.com/cloudtrail/pricing/

## Issues Found
- The post said CloudTrail Event History cannot be exported. AWS documents Event History as viewable, searchable, downloadable, and limited to the past 90 days of management events, so the wording was corrected to describe it as a limited history that cannot be used for alerting or long-term retention.
- The S3 versioning comment said versioning prevents log tampering. Versioning helps preserve previous object versions but does not by itself prevent tampering by a principal with sufficient permissions, so the wording was changed to say it makes tampering easier to detect and recover from.
- The CloudTrail S3 bucket policy omitted AWS's recommended `aws:SourceArn` condition. The example policy was updated to include the trail ARN in both the ACL check and write statements.
- The Athena `CREATE EXTERNAL TABLE` example used the JSON SerDe but omitted the CloudTrail input and output formats needed for CloudTrail log files. The DDL was updated with `com.amazon.emr.cloudtrail.CloudTrailInputFormat` and `HiveIgnoreKeyTextOutputFormat`.
- The CloudTrail Insights pricing listed only the management-event rate. The pricing section was updated to include the separate current rates for management events and data events.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was verified against AWS's official CLI command reference and CloudTrail documentation rather than local `aws help` output. The referenced OneUptime internal link returned HTTP 200 on 2026-06-03.
