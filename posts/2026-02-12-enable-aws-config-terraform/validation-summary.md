# Validation Summary: How to Enable AWS Config with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Config
- Terraform
- HashiCorp AWS Provider
- AWS IAM
- Amazon S3
- AWS Systems Manager Automation
- AWS Config managed rules
- AWS Config conformance packs
- Amazon SNS

## Sources Consulted
- AWS Config PutDeliveryChannel API Reference: https://docs.aws.amazon.com/config/latest/APIReference/API_PutDeliveryChannel.html
- AWS Config PutRemediationConfigurations API Reference: https://docs.aws.amazon.com/config/latest/APIReference/API_PutRemediationConfigurations.html
- AWS Systems Manager Automation runbook reference for AWS-EnableS3BucketEncryption: https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-enableS3bucketencryption.html
- AWS Config required-tags managed rule documentation: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS Config guardduty-enabled-centralized managed rule documentation: https://docs.aws.amazon.com/config/latest/developerguide/guardduty-enabled-centralized.html
- AWS Config S3 bucket policy documentation: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy.html
- AWS managed policy reference for AWS_ConfigRole: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWS_ConfigRole.html
- Terraform AWS Provider aws_config_configuration_recorder documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_recorder
- Terraform AWS Provider aws_config_delivery_channel documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_delivery_channel
- Terraform AWS Provider aws_config_config_rule documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule
- Terraform AWS Provider aws_config_remediation_configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_remediation_configuration
- Terraform AWS Provider aws_config_conformance_pack documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_conformance_pack

## Issues Found
- The post description mentioned custom rules, but the article does not include a custom AWS Config rule example. Removed "custom rules" from the description so the metadata matches the actual technical content.
- The required-tags section said the rule checks EC2 instances and RDS databases, but the Terraform scope also included S3 buckets. Updated the sentence to include S3 buckets.
- The automatic remediation example enabled `automatic = true` without passing `AutomationAssumeRole`. AWS Config requires an `AutomationAssumeRole` value for automatic remediation. Added an SSM Automation role, a minimal S3 bucket encryption permission policy, and the `AutomationAssumeRole` remediation parameter.
- The conformance pack section claimed the inline two-rule template deployed the CIS AWS Foundations Benchmark conformance pack. Reworded it as a small CIS-style conformance pack with two checks, because the snippet is not the full AWS sample CIS pack.
- The SNS notification section created a second `aws_config_delivery_channel` named `default`. AWS Config supports only one delivery channel per account per Region, so this would conflict with the earlier delivery channel. Updated the example to show adding `sns_topic_arn` to the existing delivery channel resource.

## Review Notes
The S3 bucket policy example is functionally aligned with AWS Config delivery requirements, but a production version should usually narrow the object path and add confused-deputy protections such as source account/source ARN conditions where appropriate.
