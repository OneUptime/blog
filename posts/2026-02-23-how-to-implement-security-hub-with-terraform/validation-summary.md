# Validation Summary: How to Implement Security Hub with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Security Hub CSPM
- AWS Organizations
- Amazon EventBridge
- Amazon SNS
- Amazon SQS
- AWS KMS
- Amazon GuardDuty
- Amazon Inspector
- Amazon Macie
- AWS Firewall Manager

## Sources Consulted
- Terraform AWS Provider `aws_securityhub_account` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_account
- Terraform AWS Provider `aws_securityhub_standards_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- Terraform AWS Provider `aws_securityhub_organization_admin_account` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_organization_admin_account
- Terraform AWS Provider `aws_securityhub_organization_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_organization_configuration
- Terraform AWS Provider `aws_securityhub_member` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_member
- Terraform AWS Provider `aws_securityhub_finding_aggregator` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_finding_aggregator
- Terraform AWS Provider `aws_securityhub_product_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_product_subscription
- Terraform AWS Provider `aws_securityhub_standards_control` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_control
- Terraform AWS Provider `aws_securityhub_action_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_action_target
- Terraform AWS Provider `aws_securityhub_insight` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_insight
- AWS Security Hub standards reference: https://docs.aws.amazon.com/securityhub/latest/userguide/standards-available.html
- AWS Security Hub AWS service integrations documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-internal-providers.html
- AWS Security Hub organization account management documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/orgs-accounts-enable.html
- AWS Security Hub invitation-based account management documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts-add-invite.html
- AWS Security Hub finding aggregation documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation.html
- Amazon EventBridge Security Hub event examples: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-event-formats.html

## Issues Found
- The initial `aws_securityhub_account` example explicitly subscribed to standards while leaving Security Hub's default standard enablement behavior in place. The Terraform AWS Provider defaults `enable_default_standards` to `true`, which can automatically enable AWS Foundational Security Best Practices and CIS v1.2.0. I set `enable_default_standards = false` so the post's explicit `aws_securityhub_standards_subscription` resources are the source of truth.
- The CIS AWS Foundations Benchmark v1.4.0 ARN used the legacy no-region `ruleset` ARN form. The Terraform AWS Provider documents that form for CIS v1.2.0, while CIS v1.4.0 uses the regional `standards/cis-aws-foundations-benchmark/v/1.4.0` ARN. I updated the ARN.
- The organization member example used `invite = true`. AWS documents that organization member accounts enabled with `CreateMembers` do not need an invitation, unlike manually managed standalone accounts. I changed this to `invite = false`.
- The Firewall Manager product subscription used an unsupported-looking `product/aws/firewall-manager` subscription ARN. AWS documents Firewall Manager as an automatically activated Security Hub CSPM integration after Security Hub CSPM and Firewall Manager are enabled. I replaced the Terraform subscription resource with a note reflecting the documented behavior.

## Review Notes
- The snippets reference supporting resources and variables such as aliased AWS providers, `aws_securityhub_account.management`, `aws_securityhub_account.security`, `aws_kms_key.security`, `aws_sqs_queue.remediation`, and module inputs that are not defined in the post. That is acceptable for a focused blog example, but a copy-paste-ready module would need to define them.
- The encrypted SNS topic example assumes the referenced KMS key policy permits EventBridge/SNS publishing as required by the deployment's exact encryption path.
