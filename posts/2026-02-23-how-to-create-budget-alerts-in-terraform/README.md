# How to Create Budget Alerts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Budget, Cost Management, FinOps, Alerts, Infrastructure as Code

Description: Learn how to create AWS Budget alerts with Terraform to monitor spending, track costs by service or tag, and get notified before you overspend.

---

Unexpected AWS bills are the kind of surprise nobody wants. AWS Budgets lets you set spending thresholds and get alerted when costs approach or exceed them. You can track overall account spending, costs per service, or spending tied to specific tags - and take automated actions when budgets are breached.

Managing budgets through Terraform means your cost guardrails are defined as code, applied consistently across accounts, and updated through the same review process as the rest of your infrastructure. This guide covers creating various budget types, configuring notifications, and setting up automated responses.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials with Budgets and SNS permissions
- For organization-level budgets: management account access

## Provider Configuration

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}
```

## Creating a Monthly Cost Budget

The simplest budget type tracks total account spending:

```hcl
# Monthly cost budget for the entire account
resource "aws_budgets_budget" "monthly_total" {
  name         = "monthly-total-cost"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"

  # Monthly budget that resets each month
  time_unit = "MONTHLY"

  # Notification when actual costs hit 80% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["team@example.com"]
  }

  # Notification when actual costs hit 100% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["team@example.com", "manager@example.com"]
  }

  # Notification when forecasted costs will exceed budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["team@example.com"]
  }

  tags = {
    Purpose = "cost-management"
  }
}
```

## Budget Per Service

Track spending on individual AWS services to catch runaway costs early:

```hcl
# Budget for EC2 spending
resource "aws_budgets_budget" "ec2_budget" {
  name         = "ec2-monthly-budget"
  budget_type  = "COST"
  limit_amount = "2000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Filter to only EC2 costs
  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["infra-team@example.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["infra-team@example.com"]
  }

  tags = {
    Service = "ec2"
  }
}

# Budget for RDS spending
resource "aws_budgets_budget" "rds_budget" {
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
    subscriber_email_addresses = ["data-team@example.com"]
  }

  tags = {
    Service = "rds"
  }
}
```

## Budget by Tag

If you tag resources by team or project, you can create budgets that track spending per tag:

```hcl
# Budget filtered by cost allocation tag
resource "aws_budgets_budget" "team_alpha" {
  name         = "team-alpha-monthly"
  budget_type  = "COST"
  limit_amount = "3000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Filter by the Team cost allocation tag
  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Team$alpha"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 75
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["alpha-lead@example.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["alpha-lead@example.com", "finance@example.com"]
  }

  tags = {
    Team = "alpha"
  }
}
```

## SNS Notifications

For more flexibility, send budget alerts to SNS topics. This lets you integrate with Slack, PagerDuty, or custom Lambda functions:

```hcl
# SNS topic for budget alerts
resource "aws_sns_topic" "budget_alerts" {
  name = "budget-alerts"

  tags = {
    Purpose = "cost-alerts"
  }
}

# Allow AWS Budgets to publish to the topic
resource "aws_sns_topic_policy" "budget_alerts" {
  arn = aws_sns_topic.budget_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowBudgetsPublish"
        Effect = "Allow"
        Principal = {
          Service = "budgets.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.budget_alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Email subscription for the alerts topic
resource "aws_sns_topic_subscription" "budget_email" {
  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "email"
  endpoint  = "alerts@example.com"
}

# Budget using SNS for notifications
resource "aws_budgets_budget" "with_sns" {
  name         = "monthly-with-sns"
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

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }
}
```

## Usage Budgets

Besides cost, you can also track usage hours or quantities:

```hcl
# Usage budget for EC2 instance hours
resource "aws_budgets_budget" "ec2_usage" {
  name         = "ec2-usage-hours"
  budget_type  = "USAGE"
  limit_amount = "10000"
  limit_unit   = "Hrs"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  cost_filter {
    name   = "UsageType"
    values = ["USW2-BoxUsage:t3.medium"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["ops@example.com"]
  }
}
```

## Budget Actions for Automated Responses

Budget actions can automatically respond when thresholds are breached - for example, restricting IAM permissions:

```hcl
# IAM policy that restricts resource creation
resource "aws_iam_policy" "deny_create" {
  name        = "budget-deny-create-resources"
  description = "Deny creating new resources when budget is exceeded"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyExpensiveActions"
        Effect = "Deny"
        Action = [
          "ec2:RunInstances",
          "rds:CreateDBInstance",
          "ecs:CreateService"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM role for budget actions
resource "aws_iam_role" "budget_action" {
  name = "budget-action-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "budgets.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "budget_action" {
  name = "budget-action-iam-policy"
  role = aws_iam_role.budget_action.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:AttachGroupPolicy",
          "iam:DetachGroupPolicy"
        ]
        Resource = "*"
      }
    ]
  })
}

# Budget action to apply the restrictive policy
resource "aws_budgets_budget_action" "restrict_on_exceed" {
  budget_name        = aws_budgets_budget.monthly_total.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 100
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.deny_create.arn
      groups     = ["developers"]
    }
  }

  execution_role_arn = aws_iam_role.budget_action.arn

  subscriber {
    subscription_type = "EMAIL"
    address           = "admin@example.com"
  }
}
```

## Creating Budgets Dynamically

Use a map to define multiple budgets in a compact way:

```hcl
# Define budgets in a local variable
locals {
  service_budgets = {
    ec2 = {
      service = "Amazon Elastic Compute Cloud - Compute"
      limit   = 2000
      emails  = ["infra@example.com"]
    }
    rds = {
      service = "Amazon Relational Database Service"
      limit   = 1500
      emails  = ["data@example.com"]
    }
    s3 = {
      service = "Amazon Simple Storage Service"
      limit   = 500
      emails  = ["storage@example.com"]
    }
    lambda = {
      service = "AWS Lambda"
      limit   = 300
      emails  = ["serverless@example.com"]
    }
  }
}

# Create budgets from the map
resource "aws_budgets_budget" "service_budgets" {
  for_each = local.service_budgets

  name         = "${each.key}-monthly-budget"
  budget_type  = "COST"
  limit_amount = tostring(each.value.limit)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = [each.value.service]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = each.value.emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = each.value.emails
  }
}
```

## Monitoring Beyond Budgets

Budget alerts tell you when spending crosses a line, but they are reactive by nature. Pair them with proactive monitoring through OneUptime to track the metrics that drive cost - like CPU utilization, request counts, and data transfer volumes. If you can see utilization trending up before it hits your budget threshold, you have time to right-size resources or negotiate reserved capacity.

For detailed cost breakdowns, combine budgets with Cost and Usage Reports. See our guide at https://oneuptime.com/blog/post/2026-02-23-how-to-create-cost-and-usage-reports-in-terraform/view.

## Outputs

```hcl
output "budget_names" {
  description = "Names of all created budgets"
  value = {
    for k, v in aws_budgets_budget.service_budgets : k => v.name
  }
}

output "sns_topic_arn" {
  description = "SNS topic ARN for budget alerts"
  value       = aws_sns_topic.budget_alerts.arn
}
```

## Summary

AWS Budgets are your first line of defense against cost overruns. By defining them in Terraform, you ensure that every account and every environment has appropriate spending guardrails from day one. Start with a total account budget and service-level budgets for your biggest cost drivers, then add tag-based budgets as your cost allocation strategy matures. The automated actions feature takes it a step further by enforcing spending limits without manual intervention.
