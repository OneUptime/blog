# How to Create a CloudWatch Alarm with OpenTofu on AWS - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, CloudWatch, Monitoring

Description: Learn how to create AWS CloudWatch alarms for EC2, Lambda, and custom metrics using OpenTofu to enable proactive monitoring and automated responses.

## Introduction

AWS CloudWatch Alarms monitor metrics and can trigger automated actions like scaling events, notifications, or EC2 actions. This guide shows how to create various CloudWatch alarms using OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured

## Step 1: Configure the Provider

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
  region = var.aws_region
}
```

## Step 2: Create an SNS Topic for Alarm Notifications

```hcl
resource "aws_sns_topic" "alarms" {
  name = "cloudwatch-alarms"
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

## Step 3: Create EC2 CPU Utilization Alarm

```hcl
resource "aws_cloudwatch_metric_alarm" "ec2_cpu_high" {
  alarm_name          = "ec2-cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2       # Number of evaluation periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300     # 5 minutes
  statistic           = "Average"
  threshold           = 80      # Alert when CPU > 80%
  alarm_description   = "EC2 instance CPU utilization is above 80%"

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  alarm_actions             = [aws_sns_topic.alarms.arn]
  ok_actions                = [aws_sns_topic.alarms.arn]
  insufficient_data_actions = []

  treat_missing_data = "notBreaching"

  tags = {
    Environment = "production"
  }
}
```

## Step 4: Create Lambda Error Rate Alarm

```hcl
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "lambda-error-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 5

  metric_query {
    id          = "error_rate"
    expression  = "errors/invocations*100"
    label       = "Error Rate (%)"
    return_data = true
  }

  metric_query {
    id = "errors"
    return_data = false
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_function_name
      }
    }
  }

  metric_query {
    id = "invocations"
    return_data = false
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_function_name
      }
    }
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
}
```

## Step 5: Create RDS Storage Alarm

```hcl
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "rds-free-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240  # 10 GB in bytes
  alarm_description   = "RDS free storage space is below 10 GB"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
}
```

## Step 6: Create Composite Alarm

```hcl
# Composite alarm fires when both EC2 CPU is high and RDS free storage is low

resource "aws_cloudwatch_composite_alarm" "high_load" {
  alarm_name = "high-load-composite"
  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.ec2_cpu_high.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.rds_storage_low.alarm_name})"

  alarm_actions = [aws_sns_topic.alarms.arn]
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully created CloudWatch alarms using OpenTofu for EC2, Lambda, and RDS monitoring. Composite alarms can reduce alert fatigue when you configure notifications at the composite alarm level and use the underlying alarms only for evaluation. Configure both `alarm_actions` and `ok_actions` if you want recovery notifications.
