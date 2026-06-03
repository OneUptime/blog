# Validation Summary: How to Create GuardDuty Detector with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS GuardDuty
- Terraform AWS provider
- Amazon EventBridge / CloudWatch Events
- Amazon SNS
- AWS Organizations
- Amazon S3
- AWS Lambda

## Sources Consulted
- Terraform AWS provider `aws_guardduty_detector`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector
- Terraform AWS provider `aws_guardduty_detector_feature`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- Terraform AWS provider `aws_guardduty_organization_admin_account`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_organization_admin_account
- Terraform AWS provider `aws_guardduty_organization_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_organization_configuration
- Terraform AWS provider `aws_guardduty_organization_configuration_feature`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_organization_configuration_feature
- Terraform AWS provider `aws_guardduty_member`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_member
- Terraform AWS provider `aws_guardduty_ipset`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_ipset
- AWS GuardDuty EventBridge findings documentation: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html
- AWS EventBridge event pattern operators: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- AWS GuardDuty foundational data sources: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_data-sources.html
- AWS GuardDuty pricing documentation: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-pricing.html
- AWS GuardDuty Organizations documentation: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html
- AWS GuardDuty member account documentation: https://docs.aws.amazon.com/guardduty/latest/ug/add-member-accounts-guardduty-organization.html
- Linked OneUptime EventBridge guide: https://oneuptime.com/blog/post/2026-02-12-create-eventbridge-rules-terraform/view

## Issues Found
- The detector example used the deprecated `datasources` block and claimed to enable all available data sources. Updated it to use current `aws_guardduty_detector_feature` resources for common optional protection plans.
- The organization configuration example used the deprecated nested `datasources` block. Updated it to use `aws_guardduty_organization_configuration_feature` resources with `auto_enable = "ALL"`.
- The multi-account setup showed `aws_guardduty_organization_admin_account` running in the administrator account with the current account ID. Corrected the example to show that the AWS Organizations management account designates a delegated GuardDuty administrator account.
- The member account example used `invite = true` for accounts already in AWS Organizations. Removed the invitation flag because GuardDuty invitations are not needed for AWS Organizations-managed members.
- The cost section said CloudTrail events are priced per GB and implied a universal first-30-days-free model. Updated it to distinguish CloudTrail management event pricing from VPC Flow Logs and DNS query log pricing, and to note that most GuardDuty protection plans have a 30-day trial.

## Review Notes
Terraform is not installed in this workspace, so local `terraform fmt` and `terraform validate` checks could not be run. The edited snippets were reviewed against current official provider and AWS documentation.
