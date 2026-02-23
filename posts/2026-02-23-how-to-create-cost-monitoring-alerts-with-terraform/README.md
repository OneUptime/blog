# How to Create Cost Monitoring Alerts with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Monitoring, AWS Budgets, FinOps, Infrastructure as Code, CloudWatch

Description: Learn how to set up cost monitoring alerts with Terraform using AWS Budgets, CloudWatch billing alarms, and SNS notifications to prevent unexpected cloud spending.

---

Cloud costs can spiral out of control quickly if you are not monitoring them. A misconfigured auto-scaling group, an accidentally provisioned large instance, or a forgotten resource can lead to surprise bills. Setting up cost monitoring alerts with Terraform ensures that your budget guardrails are deployed consistently and that the right people are notified when spending thresholds are breached.

In this guide, we will create a comprehensive cost monitoring system using Terraform. We will set up AWS Budgets for monthly and service-level tracking, CloudWatch billing alarms for real-time notifications, and SNS topics for alert delivery.

## Why Automate Cost Monitoring with Terraform

Many teams set up billing alerts manually through the AWS console and then forget about them. When team structures change or new services are added, the alerts do not get updated. By managing cost monitoring with Terraform, your billing alerts are version-controlled, documented, and automatically updated when you change your infrastructure.

## Provider Configuration

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Billing data is only available in us-east-1
provider "aws" {
  region = "us-east-1"
  alias  = "billing"
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Defining Budget Variables

```hcl
# variables.tf - Budget configuration
variable "monthly_budget" {
  description = "Monthly budget amount in USD"
  type        = number
  default     = 10000
}

variable "alert_emails" {
  description = "Email addresses for budget alerts"
  type        = list(string)
  default     = ["finance@example.com", "engineering-lead@example.com"]
}

variable "service_budgets" {
  description = "Per-service monthly budgets"
  type = map(object({
    budget_amount = number
    service_name  = string
  }))
  default = {
    "ec2" = {
      budget_amount = 3000
      service_name  = "Amazon Elastic Compute Cloud - Compute"
    }
    "rds" = {
      budget_amount = 2000
      service_name  = "Amazon Relational Database Service"
    }
    "s3" = {
      budget_amount = 500
      service_name  = "Amazon Simple Storage Service"
    }
    "lambda" = {
      budget_amount = 200
      service_name  = "AWS Lambda"
    }
    "cloudfront" = {
      budget_amount = 800
      service_name  = "Amazon CloudFront"
    }
  }
}
```

## Creating the Overall Monthly Budget

AWS Budgets provide the most comprehensive way to track spending:

```hcl
# budgets.tf - Create AWS Budget for overall monthly spending
resource "aws_budgets_budget" "monthly_total" {
  name         = "monthly-total-${var.environment}"
  budget_type  = "COST"
  limit_amount = var.monthly_budget
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Alert at 50% of budget (forecasted)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_emails
  }

  # Alert at 80% of budget (actual spend)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  # Alert at 100% of budget (actual spend)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
  }

  # Alert at 120% - critical overspend
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 120
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_critical.arn]
  }
}
```

## Creating Per-Service Budgets

Track spending for individual AWS services:

```hcl
# service-budgets.tf - Create budgets for each AWS service
resource "aws_budgets_budget" "service" {
  for_each = var.service_budgets

  name         = "service-${each.key}-${var.environment}"
  budget_type  = "COST"
  limit_amount = each.value.budget_amount
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Filter to specific AWS service
  cost_filter {
    name   = "Service"
    values = [each.value.service_name]
  }

  # Alert at 75% of service budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 75
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  # Alert at 100% of service budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
  }
}
```

## Creating CloudWatch Billing Alarms

CloudWatch billing alarms provide near-real-time cost monitoring:

```hcl
# billing-alarms.tf - CloudWatch billing metric alarms
resource "aws_cloudwatch_metric_alarm" "billing_total" {
  provider = aws.billing

  alarm_name          = "billing-total-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600  # 6 hours
  statistic           = "Maximum"
  threshold           = var.monthly_budget * 0.8  # 80% of budget

  dimensions = {
    Currency = "USD"
  }

  alarm_description = "Estimated charges have exceeded 80% of monthly budget ($${var.monthly_budget})"
  alarm_actions     = [aws_sns_topic.budget_alerts.arn]
}

# Per-service billing alarms for major cost drivers
resource "aws_cloudwatch_metric_alarm" "billing_service" {
  provider = aws.billing
  for_each = var.service_budgets

  alarm_name          = "billing-${each.key}-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = each.value.budget_amount * 0.9

  dimensions = {
    Currency    = "USD"
    ServiceName = each.value.service_name
  }

  alarm_description = "Estimated charges for ${each.key} exceed 90% of budget ($${each.value.budget_amount})"
  alarm_actions     = [aws_sns_topic.budget_alerts.arn]
}
```

## Setting Up SNS Alert Topics

Create SNS topics for different severity levels:

```hcl
# sns.tf - Alert notification topics
resource "aws_sns_topic" "budget_alerts" {
  name = "budget-alerts-${var.environment}"

  tags = {
    Environment = var.environment
    Purpose     = "cost-monitoring"
  }
}

resource "aws_sns_topic" "budget_critical" {
  name = "budget-critical-${var.environment}"

  tags = {
    Environment = var.environment
    Purpose     = "cost-monitoring-critical"
  }
}

# Email subscriptions for standard alerts
resource "aws_sns_topic_subscription" "budget_email" {
  for_each = toset(var.alert_emails)

  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# Email subscriptions for critical alerts
resource "aws_sns_topic_subscription" "critical_email" {
  for_each = toset(var.alert_emails)

  topic_arn = aws_sns_topic.budget_critical.arn
  protocol  = "email"
  endpoint  = each.value
}

# SNS topic policy allowing AWS Budgets to publish
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

resource "aws_sns_topic_policy" "budget_critical" {
  arn = aws_sns_topic.budget_critical.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "budgets.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.budget_critical.arn
    }]
  })
}
```

## Creating a Daily Cost Report with Lambda

Automate a daily cost summary that is sent to your team:

```hcl
# cost-report.tf - Lambda for daily cost reporting
resource "aws_lambda_function" "cost_report" {
  function_name = "daily-cost-report-${var.environment}"
  runtime       = "python3.11"
  handler       = "cost_report.handler"
  role          = aws_iam_role.cost_report.arn
  timeout       = 120

  filename         = "${path.module}/lambda/cost_report.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/cost_report.zip")

  environment {
    variables = {
      SNS_TOPIC_ARN  = aws_sns_topic.budget_alerts.arn
      MONTHLY_BUDGET = tostring(var.monthly_budget)
    }
  }
}

# Schedule the report to run daily at 8 AM UTC
resource "aws_cloudwatch_event_rule" "daily_cost_report" {
  name                = "daily-cost-report-${var.environment}"
  description         = "Triggers daily cost report"
  schedule_expression = "cron(0 8 * * ? *)"
}

resource "aws_cloudwatch_event_target" "cost_report" {
  rule      = aws_cloudwatch_event_rule.daily_cost_report.name
  target_id = "cost-report-lambda"
  arn       = aws_lambda_function.cost_report.arn
}

resource "aws_lambda_permission" "cost_report" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_cost_report.arn
}

# IAM role for the cost report Lambda
resource "aws_iam_role" "cost_report" {
  name = "cost-report-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "cost_report" {
  name = "cost-report-permissions"
  role = aws_iam_role.cost_report.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ce:GetCostAndUsage", "ce:GetCostForecast"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.budget_alerts.arn
      }
    ]
  })
}
```

## Outputs

```hcl
# outputs.tf - Export cost monitoring identifiers
output "budget_names" {
  description = "Names of all created budgets"
  value = merge(
    { "total" = aws_budgets_budget.monthly_total.name },
    { for k, v in aws_budgets_budget.service : k => v.name }
  )
}

output "alert_topic_arns" {
  description = "SNS topic ARNs for cost alerts"
  value = {
    standard = aws_sns_topic.budget_alerts.arn
    critical = aws_sns_topic.budget_critical.arn
  }
}
```

## Conclusion

Cost monitoring alerts are a safety net that every cloud deployment needs. By defining them in Terraform, you ensure that budget guardrails are always in place and updated as your infrastructure evolves. The combination of AWS Budgets for monthly tracking, CloudWatch billing alarms for real-time monitoring, and automated daily reports gives you comprehensive visibility into your cloud spending. Pair this with [infrastructure health dashboards](https://oneuptime.com/blog/post/2026-02-23-how-to-create-infrastructure-health-dashboards-with-terraform/view) to correlate cost changes with infrastructure events.
