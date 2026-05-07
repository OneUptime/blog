# Validation Summary: How to Set Up AWS Config with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Config
- AWS Identity and Access Management (IAM)
- Amazon S3
- AWS managed Config rules

## Sources Consulted
- AWS Config Developer Guide: Permissions for the IAM Role Assigned to AWS Config - https://docs.aws.amazon.com/config/latest/developerguide/iamrole-permissions.html
- AWS Config Developer Guide: Permissions for the Amazon S3 Bucket for the AWS Config Delivery Channel - https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy.html
- AWS Config Developer Guide: Working with the Delivery Channel - https://docs.aws.amazon.com/config/latest/developerguide/manage-delivery-channel.html
- AWS Config Developer Guide: AWS managed policies for AWS Config - https://docs.aws.amazon.com/config/latest/developerguide/security-iam-awsmanpol.html
- AWS Managed Policy Reference: AWS_ConfigRole - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWS_ConfigRole.html
- AWS Config API Reference: ConfigSnapshotDeliveryProperties - https://docs.aws.amazon.com/config/latest/APIReference/API_ConfigSnapshotDeliveryProperties.html
- Terraform AWS Provider docs: `aws_config_configuration_recorder` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_configuration_recorder.html.markdown
- Terraform AWS Provider docs: `aws_config_configuration_recorder_status` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_configuration_recorder_status.html.markdown
- Terraform AWS Provider docs: `aws_config_delivery_channel` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_delivery_channel.html.markdown
- Terraform AWS Provider docs: `aws_config_config_rule` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_config_rule.html.markdown
- AWS Config managed rule reference: `encrypted-volumes` - https://docs.aws.amazon.com/config/latest/developerguide/encrypted-volumes.html
- AWS Config managed rule reference: `s3-bucket-public-read-prohibited` - https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-read-prohibited.html
- AWS Config managed rule reference: `root-account-mfa-enabled` - https://docs.aws.amazon.com/config/latest/developerguide/root-account-mfa-enabled.html

## Issues Found
- The IAM role example attached the `AWS_ConfigRole` managed policy but did not grant AWS Config the S3 permissions needed to write configuration history and snapshots to the bucket. I added an inline `aws_iam_role_policy` with `s3:PutObject`, `s3:PutObjectAcl`, `s3:GetBucketAcl`, and `s3:ListBucket` permissions scoped to the Config delivery bucket and object path, matching AWS Config documentation.

## Review Notes
- `ROOT_ACCOUNT_MFA_ENABLED` is a periodic managed rule with region-availability caveats, and `ENCRYPTED_VOLUMES` is not available in every AWS region. The examples are valid, but readers should verify regional support before applying them unchanged in newer or specialized regions.
- AWS documentation currently recommends the service-linked role `AWSServiceRoleForConfig` when possible. The post's customer-managed role approach is still valid after the S3 permission fix.
