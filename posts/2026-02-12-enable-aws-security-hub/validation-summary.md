# Validation Summary: How to Enable AWS Security Hub for Centralized Security Findings

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Security Hub CSPM
- AWS CLI
- AWS Security Finding Format (ASFF)
- Amazon EventBridge
- Terraform AWS provider
- AWS security standards including CIS AWS Foundations Benchmark, AWS Foundational Security Best Practices, and PCI DSS
- AWS service integrations including GuardDuty, AWS Config, Amazon Inspector, IAM Access Analyzer, and AWS Firewall Manager

## Sources Consulted
- AWS CLI Command Reference: `enable-security-hub` - https://docs.aws.amazon.com/cli/latest/reference/securityhub/enable-security-hub.html
- AWS CLI Command Reference: `get-findings` - https://docs.aws.amazon.com/cli/latest/reference/securityhub/get-findings.html
- AWS Security Hub CSPM User Guide: Enabling a security standard - https://docs.aws.amazon.com/securityhub/latest/userguide/enable-standards.html
- AWS Security Hub CSPM User Guide: AWS service integrations - https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-internal-providers.html
- AWS Security Hub CSPM User Guide: Enabling the flow of findings from an integration - https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-integration-enable.html
- AWS Security Hub CSPM User Guide: EventBridge rules for findings - https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-all-findings.html
- AWS Security Hub CSPM User Guide: Calculating security scores - https://docs.aws.amazon.com/securityhub/latest/userguide/standards-security-score.html
- AWS Security Hub CSPM User Guide: PCI DSS standard - https://docs.aws.amazon.com/securityhub/latest/userguide/pci-standard.html
- AWS Security Hub CSPM Pricing - https://aws.amazon.com/security-hub/pricing/
- HashiCorp Terraform AWS Provider: `aws_securityhub_account` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_account
- HashiCorp Terraform AWS Provider: `aws_securityhub_standards_subscription` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- HashiCorp Terraform AWS Provider: `aws_securityhub_product_subscription` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_product_subscription
- HashiCorp Terraform AWS Provider: `aws_region` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region

## Issues Found
- The post said default Security Hub standards include "CIS AWS Foundations Benchmark" without specifying the version. Updated it to CIS AWS Foundations Benchmark v1.2.0 and AWS Foundational Security Best Practices, matching AWS CLI and Terraform provider documentation.
- The product integration section implied AWS service integrations must be manually enabled with `enable-import-findings-for-product` to start receiving findings. Updated the wording to explain that most AWS service integrations are activated automatically once both services are enabled, and that the command can re-enable finding import for an integration.
- The Terraform snippet used `aws_securityhub_account` with default behavior while also manually subscribing to standards. Since `enable_default_standards` defaults to `true`, that could create unintended default standard subscriptions and conflict with the explicit configuration. Set `enable_default_standards = false`.
- The Terraform snippet referenced `data.aws_region.current.name` without declaring the data source and used an attribute that is deprecated or absent in current AWS provider docs. Added `data "aws_region" "current" {}` and changed references to `data.aws_region.current.id`.
- The compliance-failure query filtered `ProductName` as `Security Hub`. Current Security Hub CSPM documentation identifies control-based findings with product name `Security Hub CSPM`, so the filter was updated.
- The security score explanation described the score as a ratio of passing to failing controls. Updated it to the proportion of passed controls to enabled controls with evaluation data, matching Security Hub documentation.
- The pricing section said the first 1,000 security checks per account per Region per month are free. Current AWS pricing uses a 30-day free trial and then charges the first 100,000 checks per account per Region per month at $0.0010 per check. Updated the cost bullets and removed the unsupported "$10-50/month for most accounts" estimate.

## Review Notes
AWS CLI was not installed in the local workspace, so command validation was performed against the official AWS CLI command reference instead of local `aws ... help` output. The post uses Security Hub CSPM / ASFF commands and EventBridge "Security Hub Findings - Imported" patterns, which remain documented, but AWS also documents newer Security Hub V2 event types and APIs for newer Security Hub capabilities.
