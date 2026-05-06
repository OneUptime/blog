# How to Create CloudWatch Composite Alarms with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Composite Alarms, Monitoring, Alert Fatigue, Infrastructure as Code

Description: Learn how to create CloudWatch Composite Alarms with OpenTofu to combine multiple metric alarms with boolean logic, reducing alert fatigue by only notifying when multiple conditions are met...

## Introduction

CloudWatch Composite Alarms use logical (AND, OR, NOT) combinations of other alarms to reduce noise. Instead of being paged for every individual metric spike, a composite alarm can require multiple signals-like high CPU AND high error rate simultaneously-before triggering a notification. This dramatically reduces false positives in busy production environments.

## Prerequisites

- OpenTofu v1.6+
- Existing CloudWatch metric alarms to combine
- AWS credentials with CloudWatch permissions

## Step 1: Create Component Metric Alarms

```hcl
# Individual metric alarms that will feed into composite alarms

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 10

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  treat_missing_data = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.project_name}-lambda-duration-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 10000  # 10 seconds

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  treat_missing_data = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${var.project_name}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = 5

  dimensions = {
    ApiName = var.api_name
  }

  treat_missing_data = "notBreaching"
}
```

## Step 2: Create Composite Alarms with Boolean Logic

```hcl
# Critical: Alert only when BOTH Lambda errors AND API 5XX errors occur simultaneously
resource "aws_cloudwatch_composite_alarm" "service_degraded" {
  alarm_name        = "${var.project_name}-service-degraded"
  alarm_description = "Service degradation: Lambda errors AND API errors simultaneously"

  alarm_rule = "ALARM(\"${aws_cloudwatch_metric_alarm.lambda_errors.alarm_name}\") AND ALARM(\"${aws_cloudwatch_metric_alarm.api_5xx_errors.alarm_name}\")"

  alarm_actions = [var.critical_sns_topic_arn]
  ok_actions    = [var.critical_sns_topic_arn]

  tags = {
    Name     = "${var.project_name}-service-degraded"
    Severity = "critical"
  }
}

# Warning: Alert when ANY performance metric is alarming
resource "aws_cloudwatch_composite_alarm" "performance_warning" {
  alarm_name        = "${var.project_name}-performance-warning"
  alarm_description = "Performance warning: any latency or error metric alarming"

  alarm_rule = "ALARM(\"${aws_cloudwatch_metric_alarm.lambda_errors.alarm_name}\") OR ALARM(\"${aws_cloudwatch_metric_alarm.lambda_duration.alarm_name}\") OR ALARM(\"${aws_cloudwatch_metric_alarm.api_5xx_errors.alarm_name}\")"

  alarm_actions = [var.warning_sns_topic_arn]

  tags = {
    Name     = "${var.project_name}-performance-warning"
    Severity = "warning"
  }
}
```

## Step 3: Nested Composite Alarms

```hcl
# Composite alarms can reference other composite alarms
resource "aws_cloudwatch_composite_alarm" "regional_outage" {
  alarm_name        = "${var.project_name}-regional-outage"
  alarm_description = "All services in region are impacted"

  # Alert when service is degraded AND RDS is also unhealthy
  alarm_rule = "ALARM(\"${aws_cloudwatch_composite_alarm.service_degraded.alarm_name}\") AND ALARM(\"${var.rds_connection_alarm_name}\")"

  alarm_actions = [var.pagerduty_sns_topic_arn]

  tags = {
    Name     = "${var.project_name}-regional-outage"
    Severity = "p1"
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# View composite alarm state
aws cloudwatch describe-alarms \
  --alarm-types CompositeAlarm \
  --alarm-names my-project-service-degraded
```

## Conclusion

Composite alarms are the most effective tool for reducing alert fatigue in AWS environments. Use AND conditions to create high-confidence critical alerts that only fire when multiple symptoms appear together, and OR conditions for broad coverage warning alerts. Nested composite alarms enable hierarchical alert structures-team-level alerts can feed into service-level composites for executive dashboards.
