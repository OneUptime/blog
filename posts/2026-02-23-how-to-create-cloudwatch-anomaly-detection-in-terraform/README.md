# How to Create CloudWatch Anomaly Detection in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, Anomaly Detection, Monitoring, Infrastructure as Code

Description: Learn how to set up CloudWatch anomaly detection alarms using Terraform to automatically identify unusual patterns in your metrics without static thresholds.

---

Static threshold alarms work well when you know exactly what "normal" looks like, but many metrics follow patterns that change throughout the day, week, or season. CloudWatch anomaly detection uses machine learning to model the expected behavior of a metric and alert you when the actual value deviates significantly from the predicted range. This guide shows you how to configure anomaly detection with Terraform.

## Understanding Anomaly Detection

CloudWatch anomaly detection creates a model that learns the expected behavior of your metrics. The model accounts for hourly, daily, and weekly patterns. Instead of comparing against a fixed threshold, you compare against an expected band. When the metric goes above or below this band, the alarm fires. This is particularly useful for metrics like request counts or CPU utilization that naturally vary throughout the day.

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

# SNS topic for anomaly alerts
resource "aws_sns_topic" "anomaly_alerts" {
  name = "anomaly-detection-alerts"
}
```

## Creating an Anomaly Detection Model

```hcl
# Create an anomaly detection model for EC2 CPU utilization
resource "aws_cloudwatch_metric_alarm" "cpu_anomaly" {
  alarm_name          = "ec2-cpu-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 2
  # Anomaly band width - higher means wider band, fewer alerts
  threshold_metric_id = "anomaly_band"
  alarm_description   = "EC2 CPU utilization is anomalously high"
  alarm_actions       = [aws_sns_topic.anomaly_alerts.arn]
  ok_actions          = [aws_sns_topic.anomaly_alerts.arn]

  metric_query {
    id          = "actual"
    return_data = true

    metric {
      metric_name = "CPUUtilization"
      namespace   = "AWS/EC2"
      period      = 300
      stat        = "Average"

      dimensions = {
        InstanceId = var.instance_id
      }
    }
  }

  metric_query {
    id          = "anomaly_band"
    expression  = "ANOMALY_DETECTION_BAND(actual, 2)"
    label       = "CPU Anomaly Band"
    return_data = true
  }
}

variable "instance_id" {
  type = string
}
```

## Request Count Anomaly Detection

Perfect for detecting unusual traffic patterns:

```hcl
# Detect anomalous request rates on an ALB
resource "aws_cloudwatch_metric_alarm" "request_anomaly" {
  alarm_name          = "alb-request-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 3
  threshold_metric_id = "request_band"
  alarm_description   = "ALB request rate is anomalously high - possible attack or traffic spike"
  alarm_actions       = [aws_sns_topic.anomaly_alerts.arn]
  ok_actions          = [aws_sns_topic.anomaly_alerts.arn]

  metric_query {
    id          = "requests"
    return_data = true

    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"

      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  metric_query {
    id          = "request_band"
    expression  = "ANOMALY_DETECTION_BAND(requests, 2)"
    label       = "Request Count Anomaly Band"
    return_data = true
  }
}

# Also detect anomalously LOW traffic (potential outage indicator)
resource "aws_cloudwatch_metric_alarm" "request_anomaly_low" {
  alarm_name          = "alb-request-anomaly-low"
  comparison_operator = "LessThanLowerThreshold"
  evaluation_periods  = 3
  threshold_metric_id = "request_band_low"
  alarm_description   = "ALB request rate is anomalously low - possible DNS or routing issue"
  alarm_actions       = [aws_sns_topic.anomaly_alerts.arn]
  ok_actions          = [aws_sns_topic.anomaly_alerts.arn]

  metric_query {
    id          = "requests_low"
    return_data = true

    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"

      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  metric_query {
    id          = "request_band_low"
    expression  = "ANOMALY_DETECTION_BAND(requests_low, 2)"
    label       = "Request Count Anomaly Band"
    return_data = true
  }
}

variable "alb_arn_suffix" {
  type = string
}
```

## Error Rate Anomaly Detection

```hcl
# Detect anomalous error rates
resource "aws_cloudwatch_metric_alarm" "error_anomaly" {
  alarm_name          = "app-error-rate-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 2
  threshold_metric_id = "error_band"
  alarm_description   = "Application error rate is anomalously high"
  alarm_actions       = [aws_sns_topic.anomaly_alerts.arn]
  ok_actions          = [aws_sns_topic.anomaly_alerts.arn]

  metric_query {
    id          = "errors"
    return_data = true

    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"

      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  metric_query {
    id          = "error_band"
    expression  = "ANOMALY_DETECTION_BAND(errors, 3)"
    label       = "Error Rate Anomaly Band"
    return_data = true
  }
}
```

## Latency Anomaly Detection

```hcl
# Detect anomalous response times
resource "aws_cloudwatch_metric_alarm" "latency_anomaly" {
  alarm_name          = "app-latency-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 3
  threshold_metric_id = "latency_band"
  alarm_description   = "Application latency is anomalously high"
  alarm_actions       = [aws_sns_topic.anomaly_alerts.arn]
  ok_actions          = [aws_sns_topic.anomaly_alerts.arn]

  metric_query {
    id          = "latency"
    return_data = true

    metric {
      metric_name = "TargetResponseTime"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "p95"

      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  metric_query {
    id          = "latency_band"
    expression  = "ANOMALY_DETECTION_BAND(latency, 2)"
    label       = "Latency Anomaly Band"
    return_data = true
  }
}
```

## Database Anomaly Detection

```hcl
# Detect anomalous database connection patterns
resource "aws_cloudwatch_metric_alarm" "db_connections_anomaly" {
  alarm_name          = "rds-connections-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 3
  threshold_metric_id = "conn_band"
  alarm_description   = "Database connection count is anomalously high"
  alarm_actions       = [aws_sns_topic.anomaly_alerts.arn]

  metric_query {
    id          = "connections"
    return_data = true

    metric {
      metric_name = "DatabaseConnections"
      namespace   = "AWS/RDS"
      period      = 300
      stat        = "Average"

      dimensions = {
        DBInstanceIdentifier = var.db_identifier
      }
    }
  }

  metric_query {
    id          = "conn_band"
    expression  = "ANOMALY_DETECTION_BAND(connections, 2)"
    label       = "Connection Anomaly Band"
    return_data = true
  }
}

variable "db_identifier" {
  type = string
}
```

## Custom Metric Anomaly Detection

```hcl
# Detect anomalous patterns in custom business metrics
resource "aws_cloudwatch_metric_alarm" "order_anomaly" {
  alarm_name          = "order-volume-anomaly"
  comparison_operator = "LessThanLowerThreshold"
  evaluation_periods  = 3
  threshold_metric_id = "order_band"
  alarm_description   = "Order volume is anomalously low - potential checkout issue"
  alarm_actions       = [aws_sns_topic.anomaly_alerts.arn]

  metric_query {
    id          = "orders"
    return_data = true

    metric {
      metric_name = "OrderCount"
      namespace   = "Custom/Business"
      period      = 3600  # 1-hour periods for business metrics
      stat        = "Sum"
    }
  }

  metric_query {
    id          = "order_band"
    # Wider band (3) for business metrics which have more natural variance
    expression  = "ANOMALY_DETECTION_BAND(orders, 3)"
    label       = "Order Volume Anomaly Band"
    return_data = true
  }
}
```

## Configuring the Anomaly Band Width

The band width parameter controls how sensitive the detection is:

```hcl
# Tight band (1 standard deviation) - more sensitive, more alerts
resource "aws_cloudwatch_metric_alarm" "sensitive_anomaly" {
  alarm_name          = "security-metric-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 1
  threshold_metric_id = "band"

  alarm_actions = [aws_sns_topic.anomaly_alerts.arn]

  metric_query {
    id          = "metric"
    return_data = true
    metric {
      metric_name = "UnauthorizedAPICalls"
      namespace   = "Custom/Security"
      period      = 300
      stat        = "Sum"
    }
  }

  metric_query {
    id          = "band"
    # Band width of 1 = very sensitive
    expression  = "ANOMALY_DETECTION_BAND(metric, 1)"
    return_data = true
  }
}

# Wide band (4 standard deviations) - less sensitive, fewer false positives
resource "aws_cloudwatch_metric_alarm" "lenient_anomaly" {
  alarm_name          = "batch-processing-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 3
  threshold_metric_id = "band_wide"

  alarm_actions = [aws_sns_topic.anomaly_alerts.arn]

  metric_query {
    id          = "metric_wide"
    return_data = true
    metric {
      metric_name = "BatchJobDuration"
      namespace   = "Custom/Application"
      period      = 3600
      stat        = "Average"
    }
  }

  metric_query {
    id          = "band_wide"
    # Band width of 4 = lenient, only extreme outliers
    expression  = "ANOMALY_DETECTION_BAND(metric_wide, 4)"
    return_data = true
  }
}
```

## Best Practices

Anomaly detection requires at least two weeks of historical data to build an accurate model, so deploy the alarm before you expect it to be accurate. Use a band width of 2 as a starting point and adjust based on alert volume. Start with GreaterThanUpperThreshold for most metrics since abnormally high values are usually more concerning. Use LessThanLowerThreshold for traffic and business metrics where a sudden drop indicates a problem. Combine anomaly detection with static thresholds for critical metrics. Use longer evaluation periods (3 or more) to reduce false positives from brief fluctuations.

For static threshold monitoring, see our guides on [CloudWatch alarms for EC2](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-ec2-in-terraform/view) and [CloudWatch metric filters](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-metric-filters-in-terraform/view).

## Conclusion

CloudWatch anomaly detection configured through Terraform replaces static thresholds with intelligent, pattern-aware monitoring. By learning the normal behavior of your metrics, anomaly detection catches issues that would be invisible to traditional alarms while reducing false positives from expected variations. Whether monitoring traffic patterns, error rates, or business metrics, anomaly detection provides a more nuanced view of your system's health.
