# Validation Summary: How to Set Up GuardDuty Across Multiple AWS Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon GuardDuty
- AWS Organizations
- AWS CLI
- Amazon EventBridge
- Amazon SNS
- Terraform AWS Provider

## Sources Consulted
- AWS CLI Command Reference: `guardduty update-organization-configuration` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/update-organization-configuration.html
- AWS CLI Command Reference: `guardduty get-member-detectors` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/get-member-detectors.html
- AWS CLI Command Reference: `guardduty create-filter` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/create-filter.html
- AWS CLI Command Reference: `guardduty get-usage-statistics` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/get-usage-statistics.html
- Amazon GuardDuty User Guide: Managing GuardDuty accounts with AWS Organizations - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html
- Amazon GuardDuty User Guide: Designating a delegated GuardDuty administrator account - https://docs.aws.amazon.com/guardduty/latest/ug/delegated-admin-designate.html
- Amazon GuardDuty FAQs - https://aws.amazon.com/guardduty/faqs/
- Terraform Registry: `aws_guardduty_detector` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector
- Terraform Registry: `aws_guardduty_detector_feature` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- Terraform Registry: `aws_guardduty_organization_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_organization_configuration
- Terraform Registry: `aws_guardduty_organization_configuration_feature` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_organization_configuration_feature

## Issues Found
- The Terraform example used deprecated `datasources` blocks on `aws_guardduty_detector` and `aws_guardduty_organization_configuration`. Updated it to use `aws_guardduty_detector_feature` and `aws_guardduty_organization_configuration_feature`, which are the current Terraform AWS Provider resources for GuardDuty protection plans.
- The multi-region example said the loop would set up GuardDuty in all regions, but the command only designates the delegated administrator in each region. Updated the wording to clarify that organization configuration must also be repeated per region.

## Review Notes
AWS CLI and EventBridge examples were checked against current AWS documentation. AWS CLI and Terraform executables were not installed in the local environment, so validation used official documentation rather than local command execution.
