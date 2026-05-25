# Validation Summary: How to Create AWS Budget Alerts with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Budgets
- Amazon SNS
- AWS IAM
- AWS Systems Manager budget actions
- AWS cost allocation tags

## Sources Consulted
- Terraform AWS Provider `aws_budgets_budget` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS Provider `aws_budgets_budget_action` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget_action
- AWS Cost Management documentation, creating an Amazon SNS topic for budget notifications: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html
- AWS Cost Management documentation, budget filters: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html
- AWS Cost Management documentation, setting up a role for AWS Budgets actions: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-action-role.html
- AWS managed policy reference, `AWSBudgetsActions_RolePolicyForResourceAdministrationWithSSM`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSBudgetsActions_RolePolicyForResourceAdministrationWithSSM.html
- AWS Cost Management documentation, receiving budget alerts in chat applications: https://docs.aws.amazon.com/cost-management/latest/userguide/sns-alert-chime.html
- AWS CLI `create-budget` reference for notification limits and notification fields: https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html

## Issues Found
- The SNS example implied that an SNS HTTPS subscription could point directly to a Slack webhook. AWS documents Slack delivery through Amazon Q Developer in chat applications after adding the SNS topic as the budget alert recipient, so the post now describes using Amazon Q Developer or a transformer such as Lambda and uses a generic HTTPS endpoint that can process SNS notifications.
- The SNS topic policy allowed `budgets.amazonaws.com` without the source account and source ARN conditions shown in AWS documentation. Added `aws:SourceAccount` and `aws:SourceArn` conditions using Terraform data sources.
- The tag budget loop used `user:Team$${each.key}`, which escapes Terraform interpolation instead of producing a dollar sign followed by the team value. Changed it to `user:Team${"$"}${each.key}` to match the Terraform provider's documented tag filter format.
- The budget action role used a custom inline policy containing only `ec2:StopInstances`, which is incomplete for `RUN_SSM_DOCUMENTS` budget actions. Replaced it with the AWS managed `AWSBudgetsActions_RolePolicyForResourceAdministrationWithSSM` policy and used the partition-aware Budgets service principal.
- The reusable module's one-line variable blocks used semicolon-style syntax and included a `tags` input that was not applied. Rewrote the variables as valid multiline HCL and added a tag-based `cost_filter` block that formats tag filters as `user:Key$Value`.

## Review Notes
- AWS Budgets notifications can have service-side delivery delays after usage is incurred, so automated actions should still be treated as guardrails rather than hard spending stops.
- Cost allocation tag filters require the tags to be activated for cost allocation before they are useful for AWS Budgets filtering.
