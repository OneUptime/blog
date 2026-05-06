# How to Create CloudWatch Metric Alarms with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Metric Alarms, Monitoring, SNS, Infrastructure as Code

Description: Learn how to create CloudWatch metric alarms with OpenTofu to monitor AWS resources and trigger notifications or automated actions when thresholds are breached.

## Introduction

CloudWatch Metric Alarms watch a single metric or a math expression based on metrics and perform one or more actions based on the value relative to a threshold. Alarms have three states: OK (normal), ALARM (threshold breached), and INSUFFICIENT_DATA (not enough data points). Actions include SNS notifications, Auto Scaling policies, and EC2 actions.

## Prerequisites

- OpenTofu v1.6+
- An SNS topic for notifications
- AWS credentials with CloudWatch and SNS permissions

## Step 1: Create SNS Topic for Alarm Notifications

```hcl
resource "aws_sns_topic" "alarms" {
  name = "${var.project_name}-alarms"

  tags = {
    Name = "${var.project_name}-alarms"
  }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

After `tofu apply`, confirm the subscription from the verification email before CloudWatch notifications can be delivered.

## Step 2: Create Lambda Error Count Alarm

```hcl
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60  # 60-second evaluation period
  statistic           = "Sum"
  threshold           = 5   # Alert if more than 5 errors per minute

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_description = "Lambda function error count is elevated"
  alarm_actions     = [aws_sns_topic.alarms.arn]
  ok_actions        = [aws_sns_topic.alarms.arn]

  treat_missing_data = "notBreaching"  # Missing data = OK (function not invoked)

  tags = {
    Name = "${var.project_name}-lambda-errors"
  }
}
```

## Step 3: Create EC2 CPU Utilization Alarm

```hcl
resource "aws_cloudwatch_metric_alarm" "ec2_cpu_high" {
  alarm_name          = "${var.project_name}-ec2-cpu-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80.0

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  alarm_description = "EC2 CPU utilization exceeded 80% for 15 minutes"
  alarm_actions     = [aws_sns_topic.alarms.arn, var.autoscaling_policy_arn]
  ok_actions        = [aws_sns_topic.alarms.arn]

  treat_missing_data = "breaching"  # Treat missing data as alarm
}
```

## Step 4: Create Metric Math Alarm

```hcl
# Alarm using metric math: error rate = errors / invocations * 100

resource "aws_cloudwatch_metric_alarm" "lambda_error_rate" {
  alarm_name          = "${var.project_name}-lambda-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 5.0  # Alert if error rate > 5%

  metric_query {
    id          = "error_rate"
    expression  = "(errors / invocations) * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 60
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_function_name
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 60
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_function_name
      }
    }
  }

  alarm_description  = "Lambda function error rate exceeded 5%"
  alarm_actions = [aws_sns_topic.alarms.arn]
  treat_missing_data = "notBreaching"  # Missing data = OK when the function is idle
}
```

## Step 5: RDS Database Alarms

```hcl
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${var.project_name}-rds-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.rds_max_connections * 0.8  # Alert at 80% of max

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Manually set alarm state to test notifications
aws cloudwatch set-alarm-state \
  --alarm-name my-project-lambda-errors \
  --state-value ALARM \
  --state-reason "Testing alarm notification"
```

## Conclusion

CloudWatch alarms are the foundation of AWS monitoring. Set `treat_missing_data` appropriately: use `notBreaching` for metrics that naturally have no data during quiet periods (like Lambda when not invoked), and use `breaching` only when missing data itself should indicate a problem. Metric math alarms enable alerting on derived metrics like error rates rather than raw counts, and with `treat_missing_data = "notBreaching"` they can reduce false positives during low-traffic periods.
