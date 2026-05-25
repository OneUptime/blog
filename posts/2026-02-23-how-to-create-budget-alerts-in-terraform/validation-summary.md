# Validation Summary: How to Create Budget Alerts in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Budgets
- Amazon SNS
- AWS IAM
- AWS Cost Management

## Sources Consulted
- Terraform AWS Provider `aws_budgets_budget` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS Provider `aws_budgets_budget_action` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget_action
- Terraform AWS Provider `aws_sns_topic_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- AWS Cost Management User Guide, creating an Amazon SNS topic for budget notifications: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html
- AWS Billing and Cost Management API Reference, CreateBudgetAction: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_CreateBudgetAction.html

## Issues Found
- The SNS topic policy allowed AWS Budgets to publish with `aws:SourceAccount`, but omitted the `aws:SourceArn` condition shown in AWS's Budgets SNS notification policy guidance. I added a partition-aware `aws:SourceArn` condition and the required `aws_partition` data source so the example matches AWS's documented policy shape and remains valid outside the standard AWS partition.

## Review Notes
- The post pins the AWS provider to `~> 5.0`. The examples reviewed still use valid resource arguments, but AWS provider 6.x is current as of this validation date. A future refresh could update the provider version if the blog wants to track the latest major provider release.
