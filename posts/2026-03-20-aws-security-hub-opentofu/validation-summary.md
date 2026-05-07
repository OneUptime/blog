# Validation Summary: How to Configure AWS Security Hub with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Security Hub
- AWS Organizations
- AWS Config
- Amazon EventBridge / CloudWatch Events
- Amazon SNS
- AWS CLI

## Sources Consulted
- Terraform Registry: `aws_securityhub_account` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_account.html
- Terraform Registry: `aws_securityhub_standards_subscription` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- Terraform Registry: `aws_securityhub_finding_aggregator` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_finding_aggregator
- Terraform Registry: `aws_securityhub_organization_admin_account` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_organization_admin_account
- Terraform Registry: `aws_securityhub_organization_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_organization_configuration
- Terraform Registry: `aws_cloudwatch_event_target` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform Registry: `aws_sns_topic_policy` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- AWS Security Hub User Guide: Configuring an EventBridge rule for Security Hub CSPM findings - https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-all-findings.html
- AWS Security Hub User Guide: Enabling and configuring AWS Config for Security Hub CSPM - https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-setup-prereqs.html
- AWS Security Hub User Guide: Required AWS Config resources for control findings - https://docs.aws.amazon.com/securityhub/latest/userguide/controls-config-resources.html
- AWS Security Hub User Guide: PCI DSS in Security Hub CSPM - https://docs.aws.amazon.com/securityhub/latest/userguide/pci-standard.html
- AWS Security Hub User Guide: Enabling cross-Region aggregation - https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation-enable.html
- AWS Security Hub User Guide: Integrating Security Hub CSPM with AWS Organizations - https://docs.aws.amazon.com/securityhub/latest/userguide/designate-orgs-admin-account.html
- AWS Security Hub User Guide: Automatically enabling Security Hub CSPM in new organization accounts - https://docs.aws.amazon.com/securityhub/latest/userguide/accounts-orgs-auto-enable.html
- Amazon EventBridge User Guide: Using resource-based policies for Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS CLI Command Reference: `describe-hub` - https://docs.aws.amazon.com/cli/latest/reference/securityhub/describe-hub.html

## Issues Found
- The prerequisites did not mention AWS Config, even though Security Hub standards rely on AWS Config recording for many control findings. I added that prerequisite.
- The PCI DSS example used v3.2.1. AWS still supports it, but AWS now also supports PCI DSS v4.0.1 and recommends v4.0.1, so I updated the standards ARN to the current recommended version.
- The finding aggregator example did not depend on `aws_securityhub_account`, which can lead Terraform to create the aggregator before Security Hub is enabled. I added the dependency.
- The EventBridge rule filtered on `WorkflowStatus`, but Security Hub EventBridge finding filters use the ASFF path `Workflow.Status`. I corrected the event pattern.
- The SNS target example was missing the required resource-based policy that allows `events.amazonaws.com` to publish to the topic. I added an `aws_iam_policy_document` and `aws_sns_topic_policy`, and made the target depend on that policy.
- The organization configuration example did not depend on the delegated admin account resource. I added the dependency so Terraform applies them in the required order.
- The deploy section used `aws securityhub get-finding-statistics --group-by-attribute "Severity.Label"`, which is not a valid current AWS CLI command for this purpose. I replaced it with `aws securityhub describe-hub` to provide a correct post-deploy verification command.

## Review Notes
- The organization example uses local configuration, which is still valid. AWS currently recommends central configuration for broader multi-account and multi-Region management.
- Finding aggregation must be created from the Region you want to use as the Security Hub home Region.
- If the SNS topic already has an existing policy, the EventBridge publish statement should be merged into that policy rather than replacing it. If the topic uses a customer-managed KMS key, additional KMS permissions may also be required for `events.amazonaws.com`.
