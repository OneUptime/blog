# Validation Summary: How to Build a Compliance Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Config and AWS Config managed rules
- AWS CloudTrail
- Amazon S3 Object Lock and bucket encryption
- AWS Systems Manager Automation runbooks
- Amazon GuardDuty
- Amazon SNS
- Amazon EventBridge / CloudWatch Events
- Amazon CloudWatch dashboards and log groups
- AWS KMS

## Sources Consulted
- Terraform AWS provider `aws_config_delivery_channel`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_delivery_channel
- Terraform AWS provider v6 upgrade guide for GuardDuty detector data source deprecation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade
- Terraform AWS provider `aws_guardduty_detector_feature`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- AWS GuardDuty feature API names: https://docs.aws.amazon.com/guardduty/latest/APIReference/API_MemberFeaturesConfiguration.html
- AWS Config managed rules list: https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html
- AWS Config compliance change notification examples: https://docs.aws.amazon.com/config/latest/developerguide/example-config-rule-compliance-notification.html
- Amazon EventBridge AWS Config events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-config.html
- Terraform AWS provider `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS CloudTrail `DataResource` API reference: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- AWS CloudTrail event selector API reference: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- Terraform AWS provider `aws_s3_bucket_object_lock_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- AWS Systems Manager Automation runbook `AWS-EnableS3BucketEncryption`: https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-enableS3bucketencryption.html
- AWS Systems Manager Automation runbook `AWS-DisablePublicAccessForSecurityGroup`: https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-disablepublicaccessforsecuritygroup.html
- Terraform AWS provider `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Amazon EventBridge resource-based policies for SNS targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html

## Issues Found
- AWS Config delivery frequency used `TwelveHours`, which is not an accepted AWS Config value. Changed it to `Twelve_Hours`.
- The architecture and remediation section described Lambda-based remediation, but the code used AWS Config remediation with SSM Automation documents. Updated the text and removed the unused Lambda function snippet so the implementation matches the described remediation path.
- The required tags Config rule was labeled as a custom Lambda rule even though it uses the AWS-managed `REQUIRED_TAGS` rule. Updated the comment.
- The CloudTrail section said CloudTrail captures every API call. Updated the wording to clarify that CloudTrail captures management events and explicitly selected data events.
- The CloudTrail S3 bucket configured Object Lock without enabling bucket versioning first. Added `aws_s3_bucket_versioning` and a dependency before the Object Lock configuration.
- The GuardDuty example used the deprecated `datasources` block on `aws_guardduty_detector`. Replaced it with `aws_guardduty_detector_feature` resources for S3 data events, EKS audit logs, and EBS malware protection.
- The GuardDuty EventBridge rule did not attach an SNS target, so it would not send notifications. Added the `aws_cloudwatch_event_target`.
- The EventBridge-to-SNS targets were missing an SNS topic policy allowing `events.amazonaws.com` to publish. Added an `aws_sns_topic_policy` using an IAM policy document.

## Review Notes
The snippets still assume supporting IAM roles, KMS key policies, bucket policies, provider configuration, and package artifacts are defined elsewhere. Terraform is not installed in this workspace, so I could not run `terraform fmt` or `terraform validate`; review was performed by static inspection against official AWS and Terraform documentation.
