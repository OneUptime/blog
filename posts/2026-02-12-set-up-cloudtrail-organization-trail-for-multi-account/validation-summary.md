# Validation Summary: How to Set Up CloudTrail Organization Trail for Multi-Account

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS CloudTrail organization trails
- AWS Organizations
- Amazon S3 bucket policies and lifecycle configuration
- AWS KMS key policies for CloudTrail SSE-KMS encryption
- Amazon CloudWatch Logs integration
- AWS CLI
- IAM roles and inline policies

## Sources Consulted
- AWS CloudTrail User Guide: Creating a trail for an organization with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-an-organizational-trail-by-using-the-aws-cli.html
- AWS CloudTrail User Guide: Prepare for creating a trail for your organization - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-an-organizational-trail-prepare.html
- AWS CloudTrail User Guide: Configure AWS KMS key policies for CloudTrail - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
- AWS CloudTrail User Guide: Encrypting CloudTrail log files, digest files, and event data stores with AWS KMS keys - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/encrypting-cloudtrail-log-files-with-aws-kms.html
- AWS CloudTrail User Guide: Filtering data events by using advanced event selectors - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/filtering-data-events.html
- AWS CloudTrail User Guide: Role policy document for CloudTrail to use CloudWatch Logs for monitoring - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-required-policy-for-cloudwatch-logs.html
- AWS CloudTrail User Guide: Organization delegated administrator - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-delegated-administrator.html
- AWS CLI Command Reference: cloudtrail create-trail - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/create-trail.html
- AWS CLI Command Reference: cloudtrail update-trail - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/update-trail.html
- AWS CLI Command Reference: organizations register-delegated-administrator - https://docs.aws.amazon.com/cli/latest/reference/organizations/register-delegated-administrator.html
- AWS CLI Command Reference: s3api put-bucket-lifecycle-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html

## Issues Found
- The S3 bucket policy snippet contained a JavaScript-style comment inside a `json` block, which would make a copied `bucket-policy.json` invalid. Removed the comment.
- The S3 bucket policy omitted the management-account `AWSLogs/<account-id>/*` write statement shown in AWS's organization trail policy example for the case where the trail is changed from an organization trail to an account trail. Added the statement while preserving the organization write statement.
- The AWS CLI flow omitted the required trusted-access setup for CloudTrail in AWS Organizations. Added `aws organizations enable-aws-service-access --service-principal cloudtrail.amazonaws.com` before creating the organization trail and added trusted access to the prerequisites.
- The KMS key creation commands did not pin the key and alias to the S3 bucket's Region. Added `--region us-east-1` to match the example bucket Region.
- The KMS key policy snippet contained a JavaScript-style comment inside a `json` block and did not include the recommended `aws:SourceArn` condition. Removed the invalid comment and added the trail ARN condition.
- Several CloudTrail commands depended on the trail home Region matching the bucket policy SourceArn. Added `--region us-east-1` to the create, start, status, event-selector, and CloudWatch Logs update commands.
- The troubleshooting note said the KMS key must be in the same Region as the trail. AWS documents that the KMS key must be in the same Region as the S3 bucket receiving the logs, so the note was corrected.

## Review Notes
The remaining examples are broadly correct for an AWS CLI based organization trail setup. In a production version, the article could mention that KMS decrypt permissions must also be granted to any users or roles that need to read encrypted CloudTrail logs, and that CloudTrail advanced event selectors overwrite existing basic event selectors.
