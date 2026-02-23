# How to Create CloudWatch Alarms for ALB in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, ALB, Monitoring, Load Balancer, Infrastructure as Code

Description: Learn how to create CloudWatch alarms for Application Load Balancers using Terraform to monitor HTTP errors, latency, and target health.

---

Application Load Balancers (ALBs) are the front door for most web applications on AWS. Monitoring them effectively means tracking HTTP error rates, response latency, target health, and request patterns. CloudWatch alarms for ALBs help you detect service degradation, backend failures, and traffic anomalies before users are affected. This guide shows you how to build comprehensive ALB monitoring with Terraform.

## Setting Up the Foundation

```hcl
# Configure the AWS provider
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

# SNS topic for ALB alarm notifications
resource "aws_sns_topic" "alb_alarms" {
  name = "alb-alarm-notifications"
}

variable "alb_arn_suffix" {
  type        = string
  description = "ALB ARN suffix (e.g., app/my-alb/1234567890)"
}

variable "target_group_arn_suffix" {
  type        = string
  description = "Target group ARN suffix"
}
```

## HTTP 5xx Error Alarms

```hcl
# ALB 5xx errors (load balancer errors)
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB is returning 5xx errors - load balancer issue"
  alarm_actions       = [aws_sns_topic.alb_alarms.arn]
  ok_actions          = [aws_sns_topic.alb_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

# Target 5xx errors (backend application errors)
resource "aws_cloudwatch_metric_alarm" "target_5xx" {
  alarm_name          = "alb-target-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 25
  alarm_description   = "Backend targets are returning 5xx errors"
  alarm_actions       = [aws_sns_topic.alb_alarms.arn]
  ok_actions          = [aws_sns_topic.alb_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

# 5xx error rate as a percentage
resource "aws_cloudwatch_metric_alarm" "target_5xx_rate" {
  alarm_name          = "alb-target-5xx-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5  # 5% error rate

  alarm_description = "Backend 5xx error rate exceeds 5%"
  alarm_actions     = [aws_sns_topic.alb_alarms.arn]
  ok_actions        = [aws_sns_topic.alb_alarms.arn]

  metric_query {
    id          = "error_rate"
    expression  = "IF(requests > 0, (errors / requests) * 100, 0)"
    label       = "5xx Error Rate (%)"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions  = { LoadBalancer = var.alb_arn_suffix }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions  = { LoadBalancer = var.alb_arn_suffix }
    }
  }
}
```

## Latency Alarms

```hcl
# Target response time alarm
resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "alb-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  # Use p95 for a better picture of user experience
  extended_statistic  = "p95"
  threshold           = 2  # 2 seconds
  alarm_description   = "ALB p95 latency exceeds 2 seconds"
  alarm_actions       = [aws_sns_topic.alb_alarms.arn]
  ok_actions          = [aws_sns_topic.alb_alarms.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

# P99 latency alarm for catching tail latency issues
resource "aws_cloudwatch_metric_alarm" "alb_latency_p99" {
  alarm_name          = "alb-p99-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 5  # 5 seconds
  alarm_description   = "ALB p99 latency exceeds 5 seconds"
  alarm_actions       = [aws_sns_topic.alb_alarms.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}
```

## Target Health Alarms

```hcl
# Unhealthy target count alarm
resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "alb-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Unhealthy targets detected behind the ALB"
  alarm_actions       = [aws_sns_topic.alb_alarms.arn]
  ok_actions          = [aws_sns_topic.alb_alarms.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }
}

# No healthy targets - critical outage
resource "aws_cloudwatch_metric_alarm" "no_healthy_targets" {
  alarm_name          = "alb-no-healthy-targets"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "No healthy targets - service is completely down"
  alarm_actions       = [aws_sns_topic.alb_alarms.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }
}
```

## Request Rate Alarms

```hcl
# Sudden traffic spike detection
resource "aws_cloudwatch_metric_alarm" "request_spike" {
  alarm_name          = "alb-request-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = var.max_requests_per_minute
  alarm_description   = "Unusual traffic spike detected on ALB"
  alarm_actions       = [aws_sns_topic.alb_alarms.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

# Traffic drop detection (potential DNS or routing issue)
resource "aws_cloudwatch_metric_alarm" "request_drop" {
  alarm_name          = "alb-request-drop"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = var.min_requests_per_5min
  alarm_description   = "Traffic has dropped significantly - possible routing issue"
  alarm_actions       = [aws_sns_topic.alb_alarms.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

variable "max_requests_per_minute" {
  type    = number
  default = 10000
}

variable "min_requests_per_5min" {
  type    = number
  default = 100
}
```

## Rejected Connection Alarm

```hcl
# Rejected connections alarm
resource "aws_cloudwatch_metric_alarm" "rejected_connections" {
  alarm_name          = "alb-rejected-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RejectedConnectionCount"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "ALB is rejecting connections - potential capacity issue"
  alarm_actions       = [aws_sns_topic.alb_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}
```

## Best Practices

Use treat_missing_data set to notBreaching for error count metrics since missing data usually means zero errors, not a problem. Monitor both ALB-generated errors and target-generated errors separately since they indicate different types of issues. Use percentile statistics (p95, p99) for latency alarms rather than averages since averages hide tail latency problems. Set up traffic drop alarms alongside spike alarms since a sudden drop in requests can indicate a DNS issue or upstream problem. Always monitor target health separately from error rates since unhealthy targets might be failing health checks before users see errors.

For monitoring the backend services behind your ALBs, see our guides on [CloudWatch alarms for ECS](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-ecs-in-terraform/view) and [CloudWatch alarms for EC2](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-ec2-in-terraform/view).

## Conclusion

ALB monitoring through CloudWatch alarms and Terraform provides the front-line defense for your web applications. By tracking HTTP errors, latency, target health, and request patterns, you get early warning of issues that could affect user experience. The metric math expressions allow you to create sophisticated alerts like error rate percentages, while the modular Terraform approach lets you apply consistent monitoring to all your load balancers.
