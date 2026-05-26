# Validation Summary: How to Create Inspector Assessments in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon Inspector
- AWS Organizations
- Amazon EventBridge
- Amazon SNS
- AWS Lambda
- Amazon ECR
- Amazon CloudWatch Logs and dashboards
- Amazon S3
- AWS KMS
- AWS IAM

## Sources Consulted
- HashiCorp Terraform AWS Provider: `aws_inspector2_enabler` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/inspector2_enabler
- HashiCorp Terraform AWS Provider: `aws_inspector2_organization_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/inspector2_organization_configuration
- HashiCorp Terraform AWS Provider: `aws_inspector2_member_association` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/inspector2_member_association
- HashiCorp Terraform AWS Provider: `aws_inspector2_filter` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/inspector2_filter
- HashiCorp Terraform AWS Provider: `aws_ecr_registry_scanning_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration
- HashiCorp Terraform AWS Provider: `aws_cloudwatch_event_target` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Amazon Inspector: Amazon EventBridge event schema - https://docs.aws.amazon.com/inspector/latest/user/eventbridge-integration.html
- Amazon EventBridge: Amazon Inspector events - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-inspector2.html
- Amazon EventBridge: resource-based policies for targets - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon Inspector: scanning Amazon EC2 instances - https://docs.aws.amazon.com/inspector/latest/user/scanning-ec2.html
- Amazon Inspector: scanning AWS Lambda functions - https://docs.aws.amazon.com/inspector/latest/user/enable-disable-scanning-lambda.html
- Amazon Inspector: activating scans for member accounts - https://docs.aws.amazon.com/inspector/latest/user/adding-member-accounts.html
- Amazon Inspector: exporting findings reports - https://docs.aws.amazon.com/inspector/latest/user/findings-managing-exporting-reports.html
- Amazon ECR: enhanced image scanning - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced.html

## Issues Found
- The prerequisites stated that EC2 instances need the SSM Agent installed for EC2 scanning. Amazon Inspector now supports hybrid EC2 scanning, with SSM-managed instances required for agent-based scanning and eligible EBS-backed instances scanned agentlessly. Updated the prerequisite to specifically call out SSM management for agent-based EC2 scanning.
- The organization-wide example associated existing member accounts but did not enable Inspector scan types for those existing accounts. Added an `aws_inspector2_enabler` resource for `var.member_account_ids`, while leaving `aws_inspector2_organization_configuration` as the auto-enable setting for new accounts.
- The EventBridge-to-CloudWatch Logs example created a log target without the required CloudWatch Logs resource policy. Added an `aws_cloudwatch_log_resource_policy` allowing EventBridge log delivery before creating the log target.

## Review Notes
- The examples use AWS provider `~> 5.0`, which remains valid for the Inspector, EventBridge, ECR, S3, KMS, and IAM resources shown. Newer provider v6 releases add fields such as Inspector code repository scanning, but the post does not depend on those newer fields.
- Lambda code scanning correctly appears alongside Lambda standard scanning; AWS requires Lambda standard scanning to be enabled when Lambda code scanning is enabled.
- The S3 and KMS policies for findings export match the Amazon Inspector documented service principal, actions, and confused-deputy conditions for standard Regions. Manually enabled Regions may require a Region-specific Inspector service principal, as noted in AWS documentation.
