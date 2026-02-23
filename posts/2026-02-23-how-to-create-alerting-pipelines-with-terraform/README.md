# How to Create Alerting Pipelines with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Alerting, SNS, CloudWatch, DevOps, Infrastructure as Code

Description: Learn how to build comprehensive alerting pipelines with Terraform using SNS topics, CloudWatch alarms, Lambda processors, and multi-channel notification delivery.

---

Alerting pipelines are the nervous system of your infrastructure. They detect anomalies, route notifications to the right people, and trigger automated responses. A poorly designed alerting pipeline leads to alert fatigue, missed incidents, and slow response times. Terraform enables you to build structured, multi-channel alerting pipelines that are consistent, testable, and version-controlled.

In this guide, we will create a complete alerting pipeline using Terraform. We will set up SNS topics for different severity levels, CloudWatch alarms with intelligent thresholds, Lambda functions for alert processing and enrichment, and multi-channel delivery to email, Slack, and PagerDuty.

## Why Build Alerting Pipelines with Terraform

Alerting pipelines that grow organically become a maintenance nightmare. Different teams create their own SNS topics, Lambda functions, and subscriptions without coordination. Terraform provides a structured approach where every component of your alerting pipeline is defined in one place, reviewed by the team, and deployed consistently.

## Provider Configuration

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
}
```

## Defining Alert Severity Levels

Create a tiered alerting structure with different notification channels for each severity:

```hcl
# variables.tf - Alert severity configuration
variable "alert_severities" {
  description = "Alert severity levels and their notification channels"
  type = map(object({
    description     = string
    email_endpoints = list(string)
    slack_webhook   = string
    pagerduty       = bool
  }))
  default = {
    "critical" = {
      description     = "Service down or data loss imminent"
      email_endpoints = ["oncall@example.com", "engineering-lead@example.com"]
      slack_webhook   = "https://hooks.slack.com/services/critical-channel"
      pagerduty       = true
    }
    "warning" = {
      description     = "Service degraded but functional"
      email_endpoints = ["engineering@example.com"]
      slack_webhook   = "https://hooks.slack.com/services/warning-channel"
      pagerduty       = false
    }
    "info" = {
      description     = "Informational alerts for awareness"
      email_endpoints = ["engineering@example.com"]
      slack_webhook   = "https://hooks.slack.com/services/info-channel"
      pagerduty       = false
    }
  }
}
```

## Creating SNS Topics for Each Severity Level

```hcl
# sns-topics.tf - Create tiered SNS topics
resource "aws_sns_topic" "alerts" {
  for_each = var.alert_severities

  name = "alerts-${each.key}-${var.environment}"

  tags = {
    Environment = var.environment
    Severity    = each.key
    ManagedBy   = "terraform"
  }
}

# Email subscriptions
resource "aws_sns_topic_subscription" "email" {
  for_each = {
    for pair in flatten([
      for severity, config in var.alert_severities : [
        for email in config.email_endpoints : {
          key      = "${severity}-${email}"
          topic    = severity
          endpoint = email
        }
      ]
    ]) : pair.key => pair
  }

  topic_arn = aws_sns_topic.alerts[each.value.topic].arn
  protocol  = "email"
  endpoint  = each.value.endpoint
}
```

## Building the Alert Processing Lambda

Create a Lambda function that enriches alerts before forwarding them to Slack and other channels:

```hcl
# alert-processor.tf - Lambda for alert enrichment and routing
resource "aws_lambda_function" "alert_processor" {
  function_name = "alert-processor-${var.environment}"
  runtime       = "python3.11"
  handler       = "alert_processor.handler"
  role          = aws_iam_role.alert_processor.arn
  timeout       = 30
  memory_size   = 256

  filename         = "${path.module}/lambda/alert_processor.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/alert_processor.zip")

  environment {
    variables = {
      ENVIRONMENT       = var.environment
      SLACK_WEBHOOK_MAP = jsonencode({
        for severity, config in var.alert_severities :
        severity => config.slack_webhook
      })
      RUNBOOK_BASE_URL = "https://wiki.example.com/runbooks"
    }
  }
}

# IAM role for the alert processor
resource "aws_iam_role" "alert_processor" {
  name = "alert-processor-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "alert_processor" {
  name = "alert-processor-permissions"
  role = aws_iam_role.alert_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:DescribeAlarms",
          "cloudwatch:GetMetricData"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [for topic in aws_sns_topic.alerts : topic.arn]
      }
    ]
  })
}

# Subscribe Lambda to all severity topics
resource "aws_sns_topic_subscription" "lambda" {
  for_each = var.alert_severities

  topic_arn = aws_sns_topic.alerts[each.key].arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.alert_processor.arn
}

# Allow SNS to invoke Lambda
resource "aws_lambda_permission" "sns" {
  for_each = var.alert_severities

  statement_id  = "AllowSNS-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alert_processor.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.alerts[each.key].arn
}
```

## Creating CloudWatch Alarms That Feed the Pipeline

Define alarms that publish to the appropriate severity topic:

```hcl
# alarms.tf - Service health alarms at different severity levels
variable "alarm_definitions" {
  description = "Alarm definitions with severity mapping"
  type = map(object({
    metric_name         = string
    namespace           = string
    comparison_operator = string
    threshold           = number
    evaluation_periods  = number
    period              = number
    statistic           = string
    severity            = string
    description         = string
    dimensions          = map(string)
  }))
  default = {
    "high_5xx_errors" = {
      metric_name         = "HTTPCode_ELB_5XX_Count"
      namespace           = "AWS/ApplicationELB"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 50
      evaluation_periods  = 2
      period              = 300
      statistic           = "Sum"
      severity            = "critical"
      description         = "High 5XX error rate on load balancer"
      dimensions          = { LoadBalancer = "app/my-alb/1234567890" }
    }
    "elevated_4xx_errors" = {
      metric_name         = "HTTPCode_ELB_4XX_Count"
      namespace           = "AWS/ApplicationELB"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 200
      evaluation_periods  = 3
      period              = 300
      statistic           = "Sum"
      severity            = "warning"
      description         = "Elevated 4XX error rate"
      dimensions          = { LoadBalancer = "app/my-alb/1234567890" }
    }
    "cpu_critical" = {
      metric_name         = "CPUUtilization"
      namespace           = "AWS/ECS"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 95
      evaluation_periods  = 3
      period              = 300
      statistic           = "Average"
      severity            = "critical"
      description         = "CPU utilization critically high"
      dimensions          = { ClusterName = "production" }
    }
    "memory_warning" = {
      metric_name         = "MemoryUtilization"
      namespace           = "AWS/ECS"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 80
      evaluation_periods  = 5
      period              = 300
      statistic           = "Average"
      severity            = "warning"
      description         = "Memory utilization is high"
      dimensions          = { ClusterName = "production" }
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "pipeline" {
  for_each = var.alarm_definitions

  alarm_name          = "${each.key}-${var.environment}"
  comparison_operator = each.value.comparison_operator
  evaluation_periods  = each.value.evaluation_periods
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = each.value.period
  statistic           = each.value.statistic
  threshold           = each.value.threshold
  alarm_description   = each.value.description

  dimensions = each.value.dimensions

  # Route to the appropriate severity topic
  alarm_actions = [aws_sns_topic.alerts[each.value.severity].arn]
  ok_actions    = [aws_sns_topic.alerts["info"].arn]

  tags = {
    Severity    = each.value.severity
    Environment = var.environment
  }
}
```

## Adding Alert Suppression with DynamoDB

Prevent alert storms by tracking recent alerts and suppressing duplicates:

```hcl
# suppression.tf - DynamoDB table for alert deduplication
resource "aws_dynamodb_table" "alert_suppression" {
  name         = "alert-suppression-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "AlertId"
  range_key    = "Timestamp"

  attribute {
    name = "AlertId"
    type = "S"
  }

  attribute {
    name = "Timestamp"
    type = "N"
  }

  # Auto-expire suppression records after 1 hour
  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }

  tags = {
    Environment = var.environment
    Purpose     = "alert-suppression"
  }
}

# Grant the alert processor access to the suppression table
resource "aws_iam_role_policy" "suppression_access" {
  name = "suppression-table-access"
  role = aws_iam_role.alert_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query"
      ]
      Resource = aws_dynamodb_table.alert_suppression.arn
    }]
  })
}
```

## Outputs

```hcl
# outputs.tf
output "alert_topic_arns" {
  description = "SNS topic ARNs by severity level"
  value       = { for k, v in aws_sns_topic.alerts : k => v.arn }
}

output "alert_processor_function" {
  description = "Alert processor Lambda function name"
  value       = aws_lambda_function.alert_processor.function_name
}

output "alarm_names" {
  description = "All alarm names and their severities"
  value = {
    for k, v in aws_cloudwatch_metric_alarm.pipeline :
    k => { name = v.alarm_name, severity = var.alarm_definitions[k].severity }
  }
}
```

## Conclusion

A well-designed alerting pipeline is the difference between catching issues early and finding out about them from angry customers. By building your alerting pipeline with Terraform, every alarm, topic, subscription, and processor is documented, reviewed, and consistent across environments. The tiered severity approach ensures critical alerts get immediate attention while informational alerts do not wake people up at night. For the metrics that feed this pipeline, check out our guide on [custom metrics collection](https://oneuptime.com/blog/post/2026-02-23-how-to-create-custom-metrics-collection-with-terraform/view).
