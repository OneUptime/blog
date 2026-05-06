# How to Set Up CloudWatch Log Metric Filters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Log Metric Filters, Observability, Monitoring, Infrastructure as Code

Description: Learn how to create CloudWatch Log Metric Filters with OpenTofu to extract operational metrics from log data and create alarms without modifying application code.

## Introduction

CloudWatch Log Metric Filters parse log entries and turn them into custom CloudWatch metrics, enabling monitoring and alerting based on log content. This allows you to track error counts, response times, user activity, and business events from existing log streams without instrumenting your application with explicit metrics.

## Prerequisites

- OpenTofu v1.6+
- An existing CloudWatch Log Group in the Standard log class
- AWS credentials with CloudWatch Logs and CloudWatch permissions, plus access to an SNS topic if you use alarm actions

## Step 1: Count Error Log Entries

```hcl
# Count ERROR-level log entries as a CloudWatch metric

resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "${var.project_name}-error-count"
  log_group_name = var.log_group_name

  # Pattern matches space-separated format: timestamp requestId ERROR message
  pattern = "[timestamp, requestId, level=ERROR, ...]"

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "${var.project_name}/Application"
    value         = "1"          # Increment by 1 for each matching log entry
    default_value = "0"          # Emit 0 when logs are ingested but no entries match in the minute
    unit          = "Count"
  }
}

# Alert when error count exceeds threshold
resource "aws_cloudwatch_metric_alarm" "high_error_count" {
  alarm_name          = "${var.project_name}-high-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ErrorCount"
  namespace           = "${var.project_name}/Application"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  treat_missing_data  = "notBreaching"

  alarm_actions = [var.sns_topic_arn]
}
```

## Step 2: Extract JSON Field Values

```hcl
# Extract numeric response time from JSON-structured logs
# Assumes log entries like: {"timestamp":"...","level":"INFO","responseTime":245,"path":"/api/users"}
resource "aws_cloudwatch_log_metric_filter" "response_time" {
  name           = "${var.project_name}-response-time"
  log_group_name = var.log_group_name

  pattern = "{ $.level = \"INFO\" && $.responseTime = * }"

  metric_transformation {
    name          = "ResponseTime"
    namespace     = "${var.project_name}/Application"
    value         = "$.responseTime"  # Extract value from JSON field
    default_value = "0"
    unit          = "Milliseconds"
  }
}

# P99 latency alarm
resource "aws_cloudwatch_metric_alarm" "p99_latency" {
  alarm_name          = "${var.project_name}-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  extended_statistic  = "p99"
  metric_name         = "ResponseTime"
  namespace           = "${var.project_name}/Application"
  period              = 300
  threshold           = 3000  # Alert if p99 > 3 seconds
  treat_missing_data  = "notBreaching"

  alarm_actions = [var.sns_topic_arn]
}
```

## Step 3: Track Security Events

```hcl
# Count failed login attempts
resource "aws_cloudwatch_log_metric_filter" "failed_logins" {
  name           = "${var.project_name}-failed-logins"
  log_group_name = var.log_group_name

  pattern = "{ $.event = \"LOGIN_FAILED\" }"

  metric_transformation {
    name          = "FailedLoginAttempts"
    namespace     = "${var.project_name}/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

# Alert on brute force attempts
resource "aws_cloudwatch_metric_alarm" "brute_force" {
  alarm_name          = "${var.project_name}-brute-force"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FailedLoginAttempts"
  namespace           = "${var.project_name}/Security"
  period              = 300  # 5-minute window
  statistic           = "Sum"
  threshold           = 50   # Alert on 50+ failures in 5 minutes
  treat_missing_data  = "notBreaching"

  alarm_actions = [var.security_sns_topic_arn]
}

# Track IAM API calls via CloudTrail logs
resource "aws_cloudwatch_log_metric_filter" "iam_policy_changes" {
  name           = "${var.project_name}-iam-changes"
  log_group_name = var.cloudtrail_log_group_name

  pattern = "{ ($.eventSource = \"iam.amazonaws.com\") && (($.eventName = \"CreatePolicy\") || ($.eventName = \"DeletePolicy\") || ($.eventName = \"AttachRolePolicy\") || ($.eventName = \"DetachRolePolicy\")) }"

  metric_transformation {
    name          = "IAMPolicyChanges"
    namespace     = "${var.project_name}/Security"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify metric filter is working
aws cloudwatch get-metric-statistics \
  --namespace my-project/Application \
  --metric-name ErrorCount \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum
```

## Conclusion

Log Metric Filters are a zero-code approach to creating operational metrics from existing log output. Use `default_value = "0"` to publish zeroes for minutes where logs are ingested but no log events match. If no logs are ingested at all, CloudWatch does not emit a data point for that minute, so configure `treat_missing_data` on your alarms if you want quiet periods handled as OK instead of `INSUFFICIENT_DATA`. For JSON-structured logs, reference field values directly in the `value` field to extract numeric measurements like latency, status codes, or payload sizes.
