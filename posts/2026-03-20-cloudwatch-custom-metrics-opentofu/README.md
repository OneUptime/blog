# How to Create CloudWatch Custom Metrics with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Metric, Monitoring, Infrastructure as Code

Description: Learn how to define CloudWatch custom metrics, dashboards, and alarms using OpenTofu for application-specific monitoring.

---

CloudWatch custom metrics let you publish application-specific data points alongside AWS service metrics. OpenTofu can define the alarms, dashboards, and metric filters that reference your custom metrics.

---

## Publish Custom Metrics via AWS CLI

```bash
# Publish a custom metric

aws cloudwatch put-metric-data   --namespace "MyApp/Production"   --metric-name "ActiveUsers"   --value 142   --unit Count   --dimensions Environment=production,Service=api
```

---

## Publish from an Application (Python)

```python
import boto3
cloudwatch = boto3.client('cloudwatch', region_name='us-east-1')

cloudwatch.put_metric_data(
    Namespace='MyApp/Production',
    MetricData=[{
        'MetricName': 'RequestLatency',
        'Value': 125.4,
        'Unit': 'Milliseconds',
        'Dimensions': [
            {'Name': 'Endpoint', 'Value': '/api/orders'},
        ]
    }]
)
```

---

## Create a CloudWatch Alarm on a Custom Metric

```hcl
resource "aws_cloudwatch_metric_alarm" "high_latency" {
  alarm_name          = "high-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "RequestLatency"
  namespace           = "MyApp/Production"
  period              = 60
  statistic           = "Average"
  threshold           = 500
  unit                = "Milliseconds"

  dimensions = {
    Endpoint = "/api/orders"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  alarm_description = "API latency exceeded 500ms for 3 consecutive minutes"
}
```

---

## Create a CloudWatch Dashboard

```hcl
resource "aws_cloudwatch_dashboard" "app" {
  dashboard_name = "MyApp-Production"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title  = "Request Latency"
          period = 60
          stat   = "Average"
          region = "us-east-1"
          metrics = [
            ["MyApp/Production", "RequestLatency", "Endpoint", "/api/orders"]
          ]
        }
      }
    ]
  })
}
```

---

## Create a Metric Filter from CloudWatch Logs

```hcl
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "error-count"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "[timestamp, level=ERROR, ...]"

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "MyApp/Production"
    value         = "1"
    default_value = "0"
  }
}
```

---

## Summary

Publish custom metrics from your application with `put-metric-data` using a custom namespace. In OpenTofu, create `aws_cloudwatch_metric_alarm` resources referencing your custom namespace and metric name. Build dashboards with `aws_cloudwatch_dashboard` and extract metrics from log groups using `aws_cloudwatch_log_metric_filter`.
