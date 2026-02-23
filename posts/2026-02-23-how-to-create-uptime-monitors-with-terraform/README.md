# How to Create Uptime Monitors with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Uptime Monitoring, AWS, GCP, Monitoring, Infrastructure as Code

Description: Learn how to create uptime monitoring infrastructure using Terraform with CloudWatch Synthetics, GCP uptime checks, and custom health check solutions.

---

Uptime monitoring continuously verifies that your services are available and responding correctly. By managing your uptime monitors through Terraform, you ensure that every service has consistent monitoring from the moment it is deployed. This guide covers creating uptime monitors across multiple platforms using Terraform.

## Understanding Uptime Monitoring

Uptime monitoring works by periodically sending requests to your endpoints and checking the response. The checks can verify HTTP status codes, response body content, SSL certificate validity, and response times. Running checks from multiple geographic locations helps distinguish between regional issues and global outages.

## Setting Up the Providers

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "google" {
  project = var.gcp_project_id
}

variable "gcp_project_id" { type = string }
```

## AWS CloudWatch Synthetics Uptime Monitor

```hcl
# S3 bucket for canary artifacts
resource "aws_s3_bucket" "canary" {
  bucket = "uptime-monitor-artifacts-${data.aws_caller_identity.current.account_id}"
}

data "aws_caller_identity" "current" {}

# IAM role for the canary
resource "aws_iam_role" "canary" {
  name = "uptime-monitor-canary-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "canary" {
  role       = aws_iam_role.canary.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchSyntheticsFullAccess"
}

# Define endpoints to monitor
variable "monitored_endpoints" {
  type = map(object({
    url           = string
    interval      = string
    content_match = string
  }))
  default = {
    "website" = {
      url           = "https://www.example.com"
      interval      = "rate(5 minutes)"
      content_match = "Welcome"
    }
    "api-health" = {
      url           = "https://api.example.com/health"
      interval      = "rate(1 minute)"
      content_match = "healthy"
    }
    "docs" = {
      url           = "https://docs.example.com"
      interval      = "rate(5 minutes)"
      content_match = "Documentation"
    }
  }
}

# Alarm for each endpoint
resource "aws_cloudwatch_metric_alarm" "uptime" {
  for_each = var.monitored_endpoints

  alarm_name          = "uptime-${each.key}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "Uptime check for ${each.key} (${each.value.url}) is failing"
  alarm_actions       = [aws_sns_topic.uptime_alerts.arn]
  ok_actions          = [aws_sns_topic.uptime_alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    CanaryName = "uptime-${each.key}"
  }
}

resource "aws_sns_topic" "uptime_alerts" {
  name = "uptime-alert-notifications"
}
```

## GCP Uptime Checks

```hcl
# GCP uptime checks for the same endpoints
resource "google_monitoring_uptime_check_config" "endpoints" {
  for_each = var.monitored_endpoints

  display_name = "Uptime: ${each.key}"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = replace(each.value.url, "https://${split("/", replace(each.value.url, "https://", ""))[0]}", "")
    port         = 443
    use_ssl      = true
    validate_ssl = true

    content_matchers {
      content = each.value.content_match
      matcher = "CONTAINS_STRING"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.gcp_project_id
      host       = split("/", replace(each.value.url, "https://", ""))[0]
    }
  }

  selected_regions = ["USA", "EUROPE", "ASIA_PACIFIC"]
}

# Notification channel for GCP alerts
resource "google_monitoring_notification_channel" "email" {
  display_name = "Uptime Alerts Email"
  type         = "email"
  labels       = { email_address = var.ops_email }
}

# Alert policy for uptime check failures
resource "google_monitoring_alert_policy" "uptime_failed" {
  for_each = google_monitoring_uptime_check_config.endpoints

  display_name = "Uptime Failed: ${each.key}"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failed"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.\"check_id\"=\"${each.value.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"
      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.*"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]
}

variable "ops_email" { type = string }
```

## Custom Health Check Lambda

```hcl
# A custom Lambda-based health checker for more complex scenarios
resource "aws_lambda_function" "health_checker" {
  function_name = "custom-health-checker"
  runtime       = "python3.11"
  handler       = "index.handler"
  role          = aws_iam_role.health_checker.arn
  timeout       = 30

  filename         = "health-checker.zip"
  source_code_hash = filebase64sha256("health-checker.zip")

  environment {
    variables = {
      ENDPOINTS     = jsonencode(var.monitored_endpoints)
      SNS_TOPIC_ARN = aws_sns_topic.uptime_alerts.arn
    }
  }
}

resource "aws_iam_role" "health_checker" {
  name = "health-checker-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "health_checker_logs" {
  role       = aws_iam_role.health_checker.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "health_checker_sns" {
  name = "sns-publish"
  role = aws_iam_role.health_checker.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sns:Publish"
      Resource = aws_sns_topic.uptime_alerts.arn
    }]
  })
}

# Schedule the health checker to run every minute
resource "aws_cloudwatch_event_rule" "health_check_schedule" {
  name                = "health-check-schedule"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "health_check" {
  rule      = aws_cloudwatch_event_rule.health_check_schedule.name
  target_id = "health-checker"
  arn       = aws_lambda_function.health_checker.arn
}

resource "aws_lambda_permission" "health_check_schedule" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health_checker.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.health_check_schedule.arn
}
```

## Best Practices

Check from multiple geographic regions to distinguish between regional and global outages. Verify response content, not just status codes, since a server returning 200 with an error page is still a failure. Set check intervals based on the criticality of the service. Use separate alerting for "degraded" versus "down" states. Keep your uptime monitoring infrastructure on a different provider or region than the services being monitored. Define your endpoints as variables so they can be easily updated and shared across monitoring tools.

For communicating uptime status to users, see our guide on [creating status pages](https://oneuptime.com/blog/post/2026-02-23-how-to-create-status-pages-with-terraform/view).

## Conclusion

Uptime monitors managed through Terraform provide consistent, multi-provider availability monitoring for your services. By defining endpoints once and monitoring them from multiple platforms and locations, you get comprehensive coverage that catches outages quickly. The Terraform approach ensures that every new service gets monitoring automatically, eliminating the gap between deployment and observability.
