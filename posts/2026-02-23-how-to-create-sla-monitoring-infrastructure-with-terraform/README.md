# How to Create SLA Monitoring Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, SLA, SLO, Monitoring, Infrastructure as Code

Description: Learn how to build SLA monitoring infrastructure using Terraform to track, measure, and report on service level agreements across your organization.

---

Service Level Agreements (SLAs) are contractual commitments about the availability, performance, and quality of your services. Monitoring SLA compliance requires collecting the right metrics, calculating compliance percentages, and alerting when you are at risk of breaching your commitments. This guide shows you how to build complete SLA monitoring infrastructure using Terraform.

## Understanding SLA Monitoring

SLA monitoring goes beyond simple uptime checking. It requires tracking specific metrics defined in your agreements (availability percentage, response time percentiles, error rates), calculating compliance over the agreed measurement window, and alerting with enough lead time to take corrective action before a breach occurs.

## Setting Up the Providers

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
```

## Availability SLA Monitoring

```hcl
# CloudWatch alarm for 99.9% availability SLA
# This tracks the percentage of successful health checks
resource "aws_cloudwatch_metric_alarm" "sla_availability" {
  alarm_name          = "sla-availability-breach-risk"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  threshold           = 99.9

  alarm_description = "Service availability is at risk of breaching the 99.9% SLA"
  alarm_actions     = [aws_sns_topic.sla_alerts.arn]
  ok_actions        = [aws_sns_topic.sla_alerts.arn]

  metric_query {
    id          = "availability"
    expression  = "(successful / total) * 100"
    label       = "Availability %"
    return_data = true
  }

  metric_query {
    id = "successful"
    metric {
      metric_name = "HealthyHostCount"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Average"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
        TargetGroup  = var.target_group_arn_suffix
      }
    }
  }

  metric_query {
    id = "total"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }
}

variable "alb_arn_suffix" { type = string }
variable "target_group_arn_suffix" { type = string }

resource "aws_sns_topic" "sla_alerts" {
  name = "sla-breach-alerts"
}
```

## Response Time SLA Monitoring

```hcl
# Monitor P95 latency against SLA target
resource "aws_cloudwatch_metric_alarm" "sla_latency" {
  alarm_name          = "sla-latency-breach-risk"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p95"
  threshold           = var.sla_latency_target_seconds
  alarm_description   = "P95 latency is approaching the SLA target of ${var.sla_latency_target_seconds}s"
  alarm_actions       = [aws_sns_topic.sla_alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

variable "sla_latency_target_seconds" {
  type    = number
  default = 2.0
}
```

## Error Budget Tracking

```hcl
# Calculate and track error budget consumption
# For a 99.9% SLA over 30 days, the error budget is ~43.2 minutes

locals {
  sla_target           = 99.9
  measurement_window   = 30 * 24 * 60  # 30 days in minutes
  error_budget_minutes = local.measurement_window * (1 - local.sla_target / 100)
}

# Track error budget consumption with a custom metric
resource "aws_cloudwatch_metric_alarm" "error_budget_50" {
  alarm_name          = "sla-error-budget-50-consumed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = local.error_budget_minutes * 0.5

  alarm_description = "50% of monthly error budget consumed"
  alarm_actions     = [aws_sns_topic.sla_alerts.arn]

  metric_query {
    id          = "downtime_minutes"
    expression  = "METRICS(\"m1\") * 5"
    label       = "Downtime Minutes"
    return_data = true
  }

  metric_query {
    id = "m1"
    metric {
      metric_name = "UnHealthyHostCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Maximum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
        TargetGroup  = var.target_group_arn_suffix
      }
    }
  }
}

# Alert at 75% budget consumed
resource "aws_cloudwatch_metric_alarm" "error_budget_75" {
  alarm_name          = "sla-error-budget-75-consumed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = local.error_budget_minutes * 0.75

  alarm_description = "75% of monthly error budget consumed - take action"
  alarm_actions     = [aws_sns_topic.sla_alerts.arn]

  metric_query {
    id          = "downtime"
    expression  = "METRICS(\"m1\") * 5"
    label       = "Downtime"
    return_data = true
  }

  metric_query {
    id = "m1"
    metric {
      metric_name = "UnHealthyHostCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Maximum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
        TargetGroup  = var.target_group_arn_suffix
      }
    }
  }
}
```

## SLA Reporting Infrastructure

```hcl
# Store SLA metrics in a dedicated S3 bucket for reporting
resource "aws_s3_bucket" "sla_reports" {
  bucket = "sla-compliance-reports-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "sla_reports" {
  bucket = aws_s3_bucket.sla_reports.id
  versioning_configuration {
    status = "Enabled"
  }
}

data "aws_caller_identity" "current" {}

# Lambda function for generating SLA reports
resource "aws_lambda_function" "sla_reporter" {
  function_name = "sla-report-generator"
  runtime       = "python3.11"
  handler       = "index.handler"
  role          = aws_iam_role.sla_reporter.arn
  timeout       = 300

  filename         = "sla-reporter.zip"
  source_code_hash = filebase64sha256("sla-reporter.zip")

  environment {
    variables = {
      S3_BUCKET        = aws_s3_bucket.sla_reports.id
      SLA_TARGETS      = jsonencode(var.sla_targets)
      SNS_TOPIC_ARN    = aws_sns_topic.sla_alerts.arn
    }
  }
}

# Schedule monthly SLA reports
resource "aws_cloudwatch_event_rule" "monthly_sla_report" {
  name                = "monthly-sla-report"
  description         = "Generate monthly SLA compliance report"
  schedule_expression = "cron(0 0 1 * ? *)"
}

resource "aws_cloudwatch_event_target" "sla_reporter" {
  rule      = aws_cloudwatch_event_rule.monthly_sla_report.name
  target_id = "sla-reporter"
  arn       = aws_lambda_function.sla_reporter.arn
}

resource "aws_lambda_permission" "sla_reporter" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sla_reporter.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.monthly_sla_report.arn
}

# IAM role for the SLA reporter
resource "aws_iam_role" "sla_reporter" {
  name = "sla-reporter-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "sla_reporter" {
  name = "sla-reporter-policy"
  role = aws_iam_role.sla_reporter.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["cloudwatch:GetMetricData", "cloudwatch:GetMetricStatistics"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.sla_reports.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.sla_alerts.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}
```

## SLA Target Configuration

```hcl
# Define SLA targets for each service
variable "sla_targets" {
  type = map(object({
    availability_target = number
    latency_p95_target  = number
    error_rate_target   = number
    measurement_window  = string
  }))
  default = {
    "api" = {
      availability_target = 99.9
      latency_p95_target  = 500
      error_rate_target   = 0.1
      measurement_window  = "monthly"
    }
    "web" = {
      availability_target = 99.5
      latency_p95_target  = 2000
      error_rate_target   = 0.5
      measurement_window  = "monthly"
    }
    "database" = {
      availability_target = 99.99
      latency_p95_target  = 50
      error_rate_target   = 0.01
      measurement_window  = "monthly"
    }
  }
}
```

## Multi-Metric SLA Dashboard

```hcl
# CloudWatch dashboard for SLA monitoring
resource "aws_cloudwatch_dashboard" "sla" {
  dashboard_name = "SLA-Compliance"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Service Availability"
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          yAxis = {
            left = { min = 0 }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Response Time P95"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "p95" }]
          ]
          period = 300
          annotations = {
            horizontal = [{
              label = "SLA Target"
              value = var.sla_latency_target_seconds
              color = "#d62728"
            }]
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Error Rate"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix, { stat = "Sum" }]
          ]
          period = 300
        }
      }
    ]
  })
}
```

## Best Practices

Define SLA targets in Terraform variables so they are explicit and version-controlled. Set up tiered alerts at 50%, 75%, and 90% of error budget consumption to give your team time to react. Generate automated monthly compliance reports and store them in a versioned S3 bucket for audit purposes. Monitor not just the current state but the trend since a metric might be within SLA now but trending toward a breach. Use separate alerting channels for SLA risk versus standard operational alerts. Align your measurement windows with your contractual SLA periods (monthly, quarterly, annually).

For the uptime monitoring that feeds into SLA tracking, see our guide on [creating uptime monitors](https://oneuptime.com/blog/post/2026-02-23-how-to-create-uptime-monitors-with-terraform/view).

## Conclusion

SLA monitoring infrastructure managed through Terraform gives you a comprehensive, automated approach to tracking and reporting on your service level agreements. By combining availability monitoring, latency tracking, error budget calculations, and automated reporting, you ensure that SLA compliance is always visible and that your team has early warning when commitments are at risk. The Terraform approach makes this infrastructure reproducible and consistent across all the services you provide.
