# Validation Summary: How to Set Up CloudTrail Organization Trails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudTrail
- AWS Organizations
- Amazon S3 bucket policies
- AWS KMS key policies
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- AWS CloudTrail User Guide: Creating a trail for an organization with the AWS CLI: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-an-organizational-trail-by-using-the-aws-cli.html
- AWS CloudTrail User Guide: Amazon S3 bucket policy for CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail User Guide: Configure AWS KMS key policies for CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
- AWS CloudTrail User Guide: Default KMS key policy created in CloudTrail console: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/default-kms-key-policy.html
- AWS CLI Command Reference: get-trail-status: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/get-trail-status.html
- AWS CLI Command Reference: describe-trails: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/describe-trails.html
- Terraform AWS Provider documentation: aws_cloudtrail resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail

## Issues Found
- The post claimed an organization trail captures "every API call, every console sign-in, every resource change." This overstated CloudTrail coverage because trails log management events by default and data events only when configured. Changed the wording to mention management events, console sign-ins, and explicitly configured data events.
- The S3 bucket policy only included the organization `AWSLogs/o-organizationid/*` write path. AWS's organization-trail policy also includes the management account `AWSLogs/<managementAccountID>/*` path for the case where the trail is changed from an organization trail to an account trail. Added that statement and clarified the explanation.
- The verification command labeled `HasCustomEventSelectors` as `Logging`, which is not the logging status. Changed the `get-trail-status` command to query `IsLogging` and delivery fields, and removed the misleading `Logging` field from the `describe-trails` query.

## Review Notes
- The Terraform `aws_cloudtrail` snippet uses documented provider arguments, including `is_organization_trail`, `is_multi_region_trail`, `enable_log_file_validation`, `cloud_watch_logs_group_arn` with the required log-stream wildcard, and an `AWS::S3::Object` event selector.
- The KMS policy examples follow AWS's documented CloudTrail key policy patterns for encrypt and decrypt permissions. In a real deployment, the principal and encryption-context conditions should be scoped to the accounts and roles that need access.
