# Validation Summary: How to Design a Compliance Module for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Config
- AWS Security Hub
- Amazon GuardDuty
- AWS CloudTrail
- AWS IAM
- Amazon S3

## Sources Consulted
- OpenTofu type constraints: https://opentofu.org/docs/language/expressions/type-constraints/
- Terraform AWS Provider `aws_config_configuration_recorder`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_recorder
- Terraform AWS Provider `aws_config_configuration_recorder_status`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_recorder_status
- Terraform AWS Provider `aws_config_delivery_channel`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_delivery_channel
- Terraform AWS Provider `aws_config_config_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule
- Terraform AWS Provider `aws_securityhub_account`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_account
- Terraform AWS Provider `aws_securityhub_standards_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- Terraform AWS Provider `aws_guardduty_detector`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector
- Terraform AWS Provider `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS Config delivery channel requirements: https://docs.aws.amazon.com/config/latest/developerguide/manage-delivery-channel.html
- Starting AWS Config with a customer managed configuration recorder: https://docs.aws.amazon.com/config/latest/developerguide/gs-cli-subscribe.html
- Permissions for the IAM role assigned to AWS Config: https://docs.aws.amazon.com/config/latest/developerguide/iamrole-permissions.html
- Permissions for the Amazon S3 bucket for the AWS Config delivery channel: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy.html
- AWS Config managed rule `s3-bucket-public-read-prohibited`: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-read-prohibited.html
- AWS Config managed rule `s3-bucket-public-write-prohibited`: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-write-prohibited.html
- AWS Config managed rule `cloudtrail-enabled`: https://docs.aws.amazon.com/config/latest/developerguide/cloudtrail-enabled.html
- AWS Config managed rule `multi-region-cloudtrail-enabled`: https://docs.aws.amazon.com/config/latest/developerguide/multi-region-cloudtrail-enabled.html
- CloudTrail S3 bucket policy requirements: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html

## Issues Found
- The AWS Config example was incomplete. `aws_config_configuration_recorder` does not start recording by itself, and AWS Config also requires a delivery channel before the recorder can be enabled. I added `config_s3_bucket`, `aws_config_delivery_channel`, and `aws_config_configuration_recorder_status`, and I gated rule creation on having a bucket configured.
- The `aws_config_config_rule` example used `dynamic "input_parameters"`, but the provider expects `input_parameters` as a JSON string argument rather than a nested block. I replaced it with `jsonencode(...)` when parameters are present.
- The custom AWS Config IAM role had no explicit S3 permissions for the delivery channel bucket. I added an IAM policy document and inline role policy granting the S3 actions AWS Config needs for bucket access and object delivery.
- The Security Hub example would have duplicated subscriptions because `aws_securityhub_account` enables default standards unless disabled, while the module also subscribed to standards explicitly. I set `enable_default_standards = false` so the module manages standards subscriptions deterministically.
- One Security Hub standard ARN was hard-coded to `us-east-1`, which was incorrect for other regions. I changed the defaults to current standards paths and built region-aware ARNs from the current partition and region, while still allowing callers to pass full ARNs.
- The default AWS Config rules mixed in region-limited IAM rules and an older EBS rule set, which made the example less portable. I replaced the defaults with region-supported S3 and CloudTrail managed rules that align with the rest of the post.
- The introduction claimed AWS Organizations policy enforcement even though no Organizations resources or policies were implemented. I removed that claim.
- The original conclusion implied the module guaranteed compliance. I softened it to a consistent baseline and made the existing S3 bucket prerequisite explicit for AWS Config and CloudTrail delivery.

## Review Notes
- `tofu` and `terraform` were not installed in the workspace, so CLI validation could not be run. The HCL snippets were successfully parsed with a generic HCL parser as a syntax sanity check.
- The CloudTrail example still assumes the caller provides an existing S3 bucket with the required bucket policy; the post now states that prerequisite explicitly instead of implying the module provisions it.
