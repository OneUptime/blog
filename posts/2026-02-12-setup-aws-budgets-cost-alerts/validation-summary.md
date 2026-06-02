# Validation Summary: How to Set Up AWS Budgets for Cost Alerts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Budgets
- AWS CLI
- Terraform AWS provider
- Amazon SNS
- AWS Lambda
- Python standard library (`json`, `urllib.request`)
- Slack incoming webhooks

## Sources Consulted
- AWS CLI Command Reference: `budgets create-budget` - https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS Budgets API Reference: `Budget` - https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Budget.html
- AWS Cost Management User Guide: Budget filters - https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html
- AWS Cost Management User Guide: Creating an Amazon SNS topic for budget notifications - https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html
- Terraform AWS provider documentation: `aws_budgets_budget` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS provider source documentation: `aws_budgets_budget` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/budgets_budget.html.markdown

## Issues Found
- The AWS CLI example used an SNS ARN with a 9-digit account segment (`123456789`). I changed it to the 12-digit sample account ID (`123456789012`) so the ARN has a valid AWS account ID shape.
- The Terraform service-budget snippet referenced `aws_sns_topic.budget_alerts.arn` without defining the topic or granting AWS Budgets permission to publish to it. I added an `aws_sns_topic`, an `aws_sns_topic_policy` allowing the `budgets.amazonaws.com` service principal to publish with `aws:SourceAccount` and `aws:SourceArn` conditions, and a `depends_on` so the budget waits for the policy.
- The EC2 usage budget combined a `Service` filter with `UsageType = "BoxUsage"`. AWS Budgets documentation says service filters are for cost and RI/Savings Plans budget types, and usage budgets should target a specific unit of measure. I changed the usage example to use `UsageTypeGroup = "EC2: Running Hours"`, matching the post's stated goal of tracking EC2 running hours.

## Review Notes
- The AWS CLI budget JSON, notification fields, comparison operators, threshold types, and `describe-budgets` / `describe-budget` commands match the current AWS CLI documentation.
- The Terraform `aws_budgets_budget` fields and notification block attributes match the current AWS provider schema. Current provider docs also support the newer `filter_expression` / `metrics` API, but the `cost_filter` examples remain documented and valid.
- The Lambda example is syntactically valid Python for receiving SNS event records and posting to an HTTPS webhook. A production deployment should store the Slack webhook URL in a secret or environment variable rather than hard-coding it.
