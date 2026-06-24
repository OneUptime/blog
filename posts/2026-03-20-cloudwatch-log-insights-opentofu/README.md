# How to Configure CloudWatch Log Insights with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Log Insights, Monitoring, Infrastructure as Code

Description: Learn how to create CloudWatch Log Groups, saved queries, and metric filters using OpenTofu for centralized log management.

---

CloudWatch Logs Insights provides an interactive query engine for log data. OpenTofu lets you provision log groups, retention policies, metric filters, and saved queries as infrastructure code.

---

## Create a Log Group

```hcl
resource "aws_cloudwatch_log_group" "app" {
  name              = "/app/production"
  retention_in_days = 30

  tags = {
    Application = "my-app"
    Environment = "production"
  }
}
```

---

## Create a Metric Filter

```hcl
resource "aws_cloudwatch_log_metric_filter" "error_rate" {
  name           = "app-error-rate"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "[timestamp, level=ERROR, ...]"

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "MyApp/Logs"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}
```

---

## Create a Saved Query

```hcl
resource "aws_cloudwatch_query_definition" "error_query" {
  name = "MyApp/Error Analysis"

  log_group_names = [aws_cloudwatch_log_group.app.name]

  query_string = <<-EOQ
    fields @timestamp, @message
    | filter @message like /ERROR/
    | sort @timestamp desc
    | limit 100
  EOQ
}
```

---

## Common CloudWatch Logs Insights Queries

```text
# Count errors by hour
fields @timestamp
| filter @message like /ERROR/
| stats count(*) as error_count by bin(1h) as hour
| sort hour desc
```

```text
# Top slowest requests
fields @timestamp, duration, endpoint
| filter duration > 1000
| sort duration desc
| limit 20
```

```text
# Error count by service
fields @timestamp, service, level
| filter level = "ERROR"
| stats count(*) as errors by service
| sort errors desc
```

---

## Create an Alarm on the Metric Filter

```hcl
resource "aws_sns_topic" "alerts" {
  name = "cloudwatch-alerts"
}

resource "aws_cloudwatch_metric_alarm" "error_rate_alarm" {
  alarm_name          = "high-error-rate"
  metric_name         = "ErrorCount"
  namespace           = "MyApp/Logs"
  period              = 300
  evaluation_periods  = 2
  threshold           = 10
  comparison_operator = "GreaterThanThreshold"
  statistic           = "Sum"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

---

## Summary

Create `aws_cloudwatch_log_group` with a `retention_in_days` policy to manage log costs. Use `aws_cloudwatch_log_metric_filter` to extract numeric metrics from log patterns. Save frequently-used CloudWatch Logs Insights queries with `aws_cloudwatch_query_definition`. Build alarms on metric filters to get notified when error rates exceed thresholds.
