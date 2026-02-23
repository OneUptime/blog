# How to Create AWS Budget Alerts with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Budget Alerts, Cost Management, FinOps

Description: Learn how to create and manage AWS Budget alerts using Terraform to monitor cloud spending and receive notifications when costs exceed defined thresholds.

---

AWS Budgets lets you set custom cost and usage budgets and receive alerts when spending approaches or exceeds your thresholds. Managing these budgets through Terraform ensures they are version-controlled, consistent across accounts, and automatically deployed. This guide covers how to create various types of AWS budget alerts with Terraform.

## Basic Monthly Cost Budget

Create a simple monthly budget with email notifications:

```hcl
resource "aws_budgets_budget" "monthly_total" {
  name         = "monthly-total-budget"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Alert at 80% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finance@company.com", "devops@company.com"]
  }

  # Alert at 100% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finance@company.com", "devops@company.com"]
  }

  # Forecasted alert at 100%
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["finance@company.com"]
  }
}
```

## Service-Specific Budgets

Create budgets for individual AWS services:

```hcl
# EC2 budget
resource "aws_budgets_budget" "ec2" {
  name         = "ec2-monthly-budget"
  budget_type  = "COST"
  limit_amount = "2000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Filter to EC2 service only
  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["compute-team@company.com"]
  }
}

# RDS budget
resource "aws_budgets_budget" "rds" {
  name         = "rds-monthly-budget"
  budget_type  = "COST"
  limit_amount = "1500"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Relational Database Service"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["data-team@company.com"]
  }
}
```

## Budget with SNS Notifications

For more flexible notifications, use SNS topics:

```hcl
# Create an SNS topic for budget alerts
resource "aws_sns_topic" "budget_alerts" {
  name = "budget-alerts"
}

# Allow AWS Budgets to publish to the topic
resource "aws_sns_topic_policy" "budget_alerts" {
  arn = aws_sns_topic.budget_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "budgets.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.budget_alerts.arn
    }]
  })
}

# Subscribe a Slack webhook or Lambda function
resource "aws_sns_topic_subscription" "slack" {
  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

# Budget with SNS notification
resource "aws_budgets_budget" "with_sns" {
  name         = "monthly-budget-sns"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }
}
```

## Tag-Based Budgets

Create budgets filtered by cost allocation tags:

```hcl
# Budget for production environment
resource "aws_budgets_budget" "production" {
  name         = "production-environment-budget"
  budget_type  = "COST"
  limit_amount = "8000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Environment$production"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["sre@company.com"]
  }
}

# Budget per team
resource "aws_budgets_budget" "team" {
  for_each = {
    platform    = { limit = "3000", email = "platform@company.com" }
    application = { limit = "2500", email = "app-team@company.com" }
    data        = { limit = "4000", email = "data-team@company.com" }
  }

  name         = "${each.key}-team-budget"
  budget_type  = "COST"
  limit_amount = each.value.limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Team$${each.key}"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [each.value.email]
  }
}
```

## Budget with Auto-Adjustment

Create budgets that automatically adjust based on historical spending:

```hcl
resource "aws_budgets_budget" "auto_adjusting" {
  name         = "auto-adjusting-budget"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  auto_adjust_data {
    auto_adjust_type = "HISTORICAL"
    historical_options {
      budget_adjustment_period = 3  # Look back 3 months
    }
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 110  # Alert at 110% of historical average
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finance@company.com"]
  }
}
```

## Budget Actions for Automated Response

Automatically respond to budget alerts with actions:

```hcl
# IAM role for budget actions
resource "aws_iam_role" "budget_action" {
  name = "budget-action-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "budgets.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "budget_action" {
  name = "budget-action-policy"
  role = aws_iam_role.budget_action.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ec2:StopInstances"]
      Resource = "*"
      Condition = {
        StringEquals = {
          "ec2:ResourceTag/Environment" = "development"
        }
      }
    }]
  })
}

# Budget with action to stop dev instances when budget exceeded
resource "aws_budgets_budget_action" "stop_dev_instances" {
  budget_name        = aws_budgets_budget.monthly_total.name
  action_type        = "RUN_SSM_DOCUMENTS"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"
  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 100
  }
  execution_role_arn = aws_iam_role.budget_action.arn

  definition {
    ssm_action_definition {
      action_sub_type = "STOP_EC2_INSTANCES"
      instance_ids    = var.dev_instance_ids
      region          = var.region
    }
  }

  subscriber {
    subscription_type = "EMAIL"
    address           = "devops@company.com"
  }
}
```

## Reusable Budget Module

Create a module for consistent budget creation:

```hcl
# modules/aws-budget/main.tf
variable "name" { type = string }
variable "limit" { type = number }
variable "service" { type = string; default = null }
variable "tags" { type = map(string); default = {} }
variable "alert_emails" { type = list(string) }
variable "thresholds" { type = list(number); default = [80, 100] }

resource "aws_budgets_budget" "this" {
  name         = var.name
  budget_type  = "COST"
  limit_amount = tostring(var.limit)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "cost_filter" {
    for_each = var.service != null ? [var.service] : []
    content {
      name   = "Service"
      values = [cost_filter.value]
    }
  }

  dynamic "notification" {
    for_each = var.thresholds
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = var.alert_emails
    }
  }
}
```

Usage:

```hcl
module "ec2_budget" {
  source       = "./modules/aws-budget"
  name         = "ec2-budget"
  limit        = 2000
  service      = "Amazon Elastic Compute Cloud - Compute"
  alert_emails = ["compute@company.com"]
  thresholds   = [50, 80, 100]
}
```

## Best Practices

Create budgets for the overall account, each service, each environment, and each team. Use forecasted alerts in addition to actual spending alerts. Set multiple threshold levels (50%, 80%, 100%) for progressive warnings. Use SNS topics for integration with Slack, PagerDuty, or custom automation. Tag all resources consistently to enable tag-based budget tracking. Review and adjust budget limits quarterly based on business growth.

## Conclusion

AWS Budget alerts managed through Terraform provide consistent, version-controlled cost monitoring across your cloud environment. By combining service-specific budgets, tag-based filtering, and automated actions, you can build a comprehensive cost management system that alerts you proactively and even takes corrective action automatically.

For related guides, see [How to Use Terraform Tags for Cost Allocation](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-tags-for-cost-allocation/view) and [How to Use Terraform for FinOps Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-for-finops-best-practices/view).
