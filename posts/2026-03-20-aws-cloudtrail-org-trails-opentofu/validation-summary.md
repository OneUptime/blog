# Validation Summary: How to Create AWS CloudTrail Organization Trails with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- AWS provider for OpenTofu / Terraform
- AWS CloudTrail
- AWS Organizations
- Amazon S3
- AWS KMS
- Amazon CloudWatch Logs
- Amazon CloudWatch Alarms
- Amazon SNS

## Sources Consulted
- Terraform AWS Provider, `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS Provider, `aws_s3_bucket_object_lock_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- Terraform AWS Provider, `aws_cloudwatch_log_metric_filter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- AWS CloudTrail, Creating a trail for an organization: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-trail-organization.html
- AWS CloudTrail, Prepare for creating a trail for your organization: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-an-organizational-trail-prepare.html
- AWS CloudTrail, Amazon S3 bucket policy for CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail, Configure AWS KMS key policies for CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
- AWS CloudTrail, Sending events to CloudWatch Logs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html
- AWS CloudTrail, Validating CloudTrail log file integrity: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html
- Amazon CloudWatch Logs, Filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- AWS CloudTrail, Organization delegated administrator: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-delegated-administrator.html

## Issues Found
- The description and opening explanation overstated CloudTrail organization trails as capturing all API activity automatically. AWS documents that organization trails capture management events across the organization, while data events must be explicitly configured and are limited to supported services. I corrected the wording and made the example explicitly management-account scoped.
- The S3 data-event selector used `arn:aws:s3:::` for all S3 object events. The AWS provider documentation for `aws_cloudtrail` uses `arn:aws:s3` for logging all S3 object data events with a basic event selector, so I corrected the value.
- The trail resource did not depend on the required S3 bucket policy or CloudWatch Logs IAM policy. The provider documentation shows an explicit dependency on the bucket policy, so I added `depends_on` to avoid create-order failures and to ensure the supporting policies exist before the trail is created.
- The S3 bucket policy was incomplete for an organization trail. AWS documents separate write permissions for the management-account `AWSLogs/<account-id>/` path and the organization `AWSLogs/<organization-id>/` path, and recommends `aws:SourceArn` conditions for organization-trail resource policies. I updated the bucket policy accordingly.
- The Object Lock example omitted S3 versioning, which the AWS provider requires before enabling Object Lock on an existing bucket. I added `aws_s3_bucket_versioning` and made the Object Lock configuration depend on it.
- Several referenced resources and data sources were missing from the post, including `aws_kms_key.cloudtrail`, `aws_sns_topic.security_alerts`, `data.aws_caller_identity.current`, `data.aws_partition.current`, `data.aws_region.current`, and `data.aws_organizations_organization.current`. I added the minimal supporting configuration needed for the snippets to be internally consistent.
- The CloudWatch Logs IAM role policy used a generic wildcard instead of the organization-trail log stream patterns AWS documents for management-account and organization log streams. I changed the policy to the documented stream ARN patterns.
- The CloudWatch log group referenced the KMS key without including the extra CloudWatch Logs key-policy permissions that would be required for that association. To keep the example correct and minimal, I removed the log-group KMS binding and added a CloudTrail-compatible KMS key policy for trail log encryption.
- The metric filter resource name was incorrect. The AWS provider resource is `aws_cloudwatch_log_metric_filter`, not `aws_cloudwatch_metric_filter`, so I corrected the resource type.
- The log-file-validation comment implied a simple hash-only mechanism. AWS documents digest files plus SHA-256 and RSA-based validation, so I clarified the comment to describe digest-file-based integrity validation instead.

## Review Notes
- AWS now allows delegated administrators to create and manage organization trails through the CLI and API, but CloudTrail organization resources remain owned by the management account. This post now stays intentionally scoped to the management-account pattern because the surrounding S3 and KMS resource policies use management-account-owned trail ARNs.
- The example still enables all S3 object data events and all Lambda function data events, which is valid but can be high-volume in larger organizations. Advanced event selectors may be a better future refinement when selective coverage or exclusions are needed.
- Local checks: `validation.json` was validated with `jq`. Runtime validation with `tofu` or `terraform` was not possible in this workspace because neither CLI is installed, and no live AWS account was available for deployment tests.
