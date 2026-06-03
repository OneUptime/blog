# Validation Summary: How to Create AWS Budget Actions for Automatic Cost Control

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Budgets
- AWS Budgets Actions
- AWS IAM
- AWS Organizations service control policies
- AWS Systems Manager automation actions for EC2 and RDS
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- AWS Cost Management User Guide: Configuring budget actions: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html
- AWS Cost Management User Guide: Configuring a budget action: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-action-configure.html
- AWS Cost Management policy examples for AWS Budgets action roles: https://docs.aws.amazon.com/cost-management/latest/userguide/billing-example-policies.html
- AWS CLI Command Reference: create-budget-action: https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget-action.html
- AWS CLI Command Reference: describe-budget-action-histories: https://docs.aws.amazon.com/cli/latest/reference/budgets/describe-budget-action-histories.html
- AWS Budgets Actions announcement and reset behavior notes: https://aws.amazon.com/about-aws/whats-new/2020/10/announcing-aws-budgets-actions/
- Terraform AWS provider: aws_budgets_budget: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS provider: aws_budgets_budget_action: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget_action
- OneUptime linked blog post: https://oneuptime.com/blog/post/2026-02-12-setup-aws-budgets-cost-alerts/view

## Issues Found
- The post described the third budget action type as targeting resources to "stop or terminate" EC2 instances. AWS Budgets Actions support SSM-backed stop actions for EC2 and RDS instances, not terminate actions. Updated the wording to "Run an SSM document" and to specify stopping EC2 or RDS instances.
- The IAM role example included incomplete permissions for EC2/RDS target actions. Updated it to match AWS's documented action role permissions, including `ec2:DescribeInstanceStatus`, EC2/RDS start and stop actions, RDS describe, and `ssm:StartAutomationExecution`.
- The Terraform SCP action example omitted `target_ids`. AWS's API requires target IDs for SCP action definitions, and Terraform exposes `target_ids` for the SCP definition. Added a sample target account ID.
- The reversal section said actions reverse when actual spend drops below the threshold. AWS documents that IAM and SCP action types reset at the beginning of each budgeted period, while EC2/RDS target actions do not reset automatically. Updated that explanation.
- The CLI reversal command used `REVERSE_ACTION`, which is not a valid `execute-budget-action` execution type. Changed it to `REVERSE_BUDGET_ACTION`.

## Review Notes
Local `aws` and `terraform` binaries were not installed in the review container, so CLI and Terraform validation was performed against official AWS and Terraform provider documentation. The Terraform snippets are illustrative and still use placeholder account IDs, policy resources, groups, and topics that readers must replace with their real environment values.
