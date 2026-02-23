# How to Monitor Cloud Spend with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cloud Monitoring, Cost Management, AWS Budgets, CloudWatch, FinOps

Description: Learn how to set up comprehensive cloud spend monitoring with Terraform using AWS Budgets, CloudWatch dashboards, Cost Explorer, and automated alerting pipelines.

---

Cloud spend monitoring is the starting point for any cost optimization effort. You cannot reduce what you cannot see. Terraform allows you to deploy a complete monitoring stack that gives you real-time visibility into your cloud spending, sends alerts when costs exceed thresholds, and provides dashboards for ongoing analysis.

This guide covers practical Terraform configurations for building a comprehensive cloud spend monitoring system on AWS.

## Setting Up AWS Budgets

AWS Budgets are the most straightforward way to track and alert on cloud spending. They support both actual and forecasted cost alerts.

```hcl
# Overall monthly budget
resource "aws_budgets_budget" "monthly_total" {
  name              = "total-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.total_monthly_budget
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  # Alert at multiple thresholds
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 50
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.finance_emails
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 75
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.finance_emails
    subscriber_sns_topic_arns = [aws_sns_topic.cost_alerts.arn]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 90
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = concat(var.finance_emails, var.engineering_leads)
    subscriber_sns_topic_arns = [aws_sns_topic.cost_alerts.arn]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = concat(var.finance_emails, var.engineering_leads)
    subscriber_sns_topic_arns = [aws_sns_topic.cost_alerts.arn]
  }
}

# Per-service budgets for top spending services
resource "aws_budgets_budget" "service_budgets" {
  for_each = var.service_budgets

  name              = "${lower(replace(each.key, " ", "-"))}-budget"
  budget_type       = "COST"
  limit_amount      = each.value
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  cost_filter {
    name   = "Service"
    values = [each.key]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.finance_emails
    subscriber_sns_topic_arns = [aws_sns_topic.cost_alerts.arn]
  }
}

# SNS topic for cost alerts
resource "aws_sns_topic" "cost_alerts" {
  name = "cloud-cost-alerts"
}
```

## CloudWatch Billing Dashboard

A visual dashboard makes it easy to track spending trends at a glance.

```hcl
# CloudWatch dashboard for billing overview
resource "aws_cloudwatch_dashboard" "billing" {
  dashboard_name = "BillingDashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6
        properties = {
          title  = "Total Estimated Charges (USD)"
          view   = "timeSeries"
          region = "us-east-1"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", {
              stat   = "Maximum"
              period = 21600
            }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Top Services by Cost"
          view   = "timeSeries"
          region = "us-east-1"
          metrics = [
            for svc in var.top_services :
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", "ServiceName", svc, {
              stat   = "Maximum"
              period = 21600
            }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Daily Cost Trend"
          view   = "bar"
          region = "us-east-1"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", {
              stat   = "Maximum"
              period = 86400
            }]
          ]
        }
      }
    ]
  })
}
```

## Cost and Usage Report Setup

The Cost and Usage Report (CUR) provides the most detailed cost data available, suitable for in-depth analysis.

```hcl
# S3 bucket for cost reports
resource "aws_s3_bucket" "cur_reports" {
  bucket = "company-cur-reports-${var.account_id}"
}

resource "aws_s3_bucket_policy" "cur_reports" {
  bucket = aws_s3_bucket.cur_reports.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action = [
          "s3:GetBucketAcl",
          "s3:GetBucketPolicy"
        ]
        Resource = aws_s3_bucket.cur_reports.arn
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.cur_reports.arn}/*"
      }
    ]
  })
}

# Cost and Usage Report definition
resource "aws_cur_report_definition" "detailed" {
  report_name                = "detailed-cost-report"
  time_unit                  = "HOURLY"
  format                     = "Parquet"
  compression                = "Parquet"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                  = aws_s3_bucket.cur_reports.id
  s3_prefix                  = "cur/"
  s3_region                  = var.region
  report_versioning          = "OVERWRITE_REPORT"
  refresh_closed_reports     = true
  additional_artifacts       = ["ATHENA"]
}

# Athena integration for querying cost data
resource "aws_athena_database" "cost_analysis" {
  name   = "cost_analysis"
  bucket = aws_s3_bucket.cur_reports.id
}

# Glue crawler for CUR data
resource "aws_glue_crawler" "cur" {
  database_name = aws_athena_database.cost_analysis.name
  name          = "cur-data-crawler"
  role          = aws_iam_role.glue_role.arn

  s3_target {
    path = "s3://${aws_s3_bucket.cur_reports.id}/cur/"
  }

  schedule = "cron(0 1 * * ? *)"
}
```

## Automated Daily Cost Summary

Send a daily email summary of cloud spending to stakeholders.

```hcl
# Lambda function for daily cost summary
resource "aws_lambda_function" "daily_summary" {
  filename         = data.archive_file.daily_summary.output_path
  function_name    = "daily-cost-summary"
  role             = aws_iam_role.cost_reporter.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 120
  source_code_hash = data.archive_file.daily_summary.output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.cost_alerts.arn
      TOP_N_SERVICES = "10"
    }
  }
}

# IAM role with Cost Explorer access
resource "aws_iam_role" "cost_reporter" {
  name = "cost-reporter-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "cost_reporter" {
  name = "cost-reporter-policy"
  role = aws_iam_role.cost_reporter.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ce:GetCostAndUsage",
          "ce:GetCostForecast",
          "ce:GetDimensionValues",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.cost_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Daily schedule
resource "aws_cloudwatch_event_rule" "daily_cost_summary" {
  name                = "daily-cost-summary"
  description         = "Send daily cost summary email"
  schedule_expression = "cron(0 8 * * ? *)"
}

resource "aws_cloudwatch_event_target" "daily_summary" {
  rule      = aws_cloudwatch_event_rule.daily_cost_summary.name
  target_id = "DailyCostSummary"
  arn       = aws_lambda_function.daily_summary.arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_summary.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_cost_summary.arn
}
```

## Cost Anomaly Detection

Complement your regular monitoring with anomaly detection to catch unexpected spikes.

```hcl
# Cost anomaly monitor
resource "aws_ce_anomaly_monitor" "services" {
  name              = "service-cost-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

# Anomaly subscription for immediate alerts
resource "aws_ce_anomaly_subscription" "immediate" {
  name      = "immediate-anomaly-alert"
  frequency = "IMMEDIATE"

  monitor_arn_list = [aws_ce_anomaly_monitor.services.arn]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_alerts.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }
}
```

## Best Practices

Set up monitoring before you start optimizing. You need baseline data to measure the impact of any changes. Use multiple alert thresholds so you get early warnings rather than a single alarm at budget exceeded. Include forecasted cost alerts, not just actual cost alerts, so you have time to react before the end of the month.

Tag everything consistently so your per-service and per-team monitoring is accurate. Untagged resources create blind spots in your cost visibility.

For more on cost management, see our guides on [cost governance with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-governance-with-terraform/view) and [cost anomaly detection with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cost-anomaly-detection-with-terraform/view).

## Conclusion

Monitoring cloud spend with Terraform creates a comprehensive, automated system that keeps your entire organization informed about cloud costs. By combining AWS Budgets, CloudWatch dashboards, Cost and Usage Reports, and daily summary emails, you build multiple layers of visibility that ensure no cost surprise goes unnoticed. The key is making cost data accessible and actionable for everyone involved in infrastructure decisions, from engineers to finance teams.
