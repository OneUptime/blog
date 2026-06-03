# Validation Summary: How to Create Security Hub with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Security Hub CSPM
- AWS Organizations
- AWS Config
- Amazon EventBridge
- AWS Lambda
- Amazon SNS
- Terraform AWS provider

## Sources Consulted
- AWS Security Hub CSPM documentation: https://docs.aws.amazon.com/securityhub/
- AWS Security Hub standards and AWS Config prerequisites: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-setup-prereqs.html
- AWS Security Hub CIS AWS Foundations Benchmark documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html
- AWS Security Hub PCI DSS documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/pci-standard.html
- AWS Security Hub IAM controls documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/iam-controls.html
- AWS Security Hub EventBridge custom action rule documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-define-rule.html
- AWS Security Hub EventBridge event formats: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-event-formats.html
- AWS Security Hub EventBridge findings rule documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-cwe-event-rules.html
- Terraform AWS provider `aws_securityhub_standards_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- Terraform AWS provider `aws_securityhub_standards_control` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_control
- Terraform AWS provider `aws_securityhub_action_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_action_target
- Terraform AWS provider `aws_securityhub_organization_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_organization_configuration
- Terraform AWS provider `aws_securityhub_finding_aggregator` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_finding_aggregator
- Terraform AWS provider `aws_securityhub_insight` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_insight
- Terraform AWS provider `aws_securityhub_member` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_member

## Issues Found
- Updated the CIS AWS Foundations Benchmark standard from v1.4.0 to v5.0.0 because AWS Security Hub CSPM now supports v5.0.0 and recommends it to stay current with security best practices.
- Updated the PCI DSS standard from v3.2.1 to v4.0.1 because AWS Security Hub CSPM recommends v4.0.1 for current PCI DSS coverage.
- Corrected the IAM user MFA disabled-control example from `IAM.6` to `IAM.5`. `IAM.6` is the root hardware MFA control, while `IAM.5` is the control for IAM users with console passwords.
- Updated the CIS standards control ARN in the CloudTrail multi-region example to use the same CIS v5.0.0 standard version as the standards subscription.
- Reworded the AWS Config cost note. Security Hub creates service-linked AWS Config rules for many controls, not simply one Config rule per enabled standard, and costs are driven by enabled checks and AWS Config recording.
- Changed the custom action EventBridge rule to match the custom action ARN in the `resources` field, which is the pattern AWS documents for Security Hub custom actions.

## Review Notes
Terraform is not installed in the workspace, so local `terraform validate` and `terraform fmt` checks could not be run. The HCL snippets were reviewed against the Terraform AWS provider resource documentation and AWS service documentation instead.
