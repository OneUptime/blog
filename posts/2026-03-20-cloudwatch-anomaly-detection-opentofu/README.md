# How to Set Up CloudWatch Anomaly Detection with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Anomaly Detection, Machine Learning, Monitoring, Infrastructure as Code

Description: Learn how to configure CloudWatch Anomaly Detection with OpenTofu to automatically detect unusual metric behavior using machine learning without manually setting fixed thresholds.

## Introduction

CloudWatch Anomaly Detection uses machine learning to continuously analyze metrics and create dynamic baselines that adapt to seasonal patterns, day-of-week variations, and long-term trends. Instead of setting static thresholds that cause false positives during expected traffic spikes, anomaly detection alarms only trigger when behavior deviates from learned patterns.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with CloudWatch permissions
- An existing CloudWatch metric with historical data (CloudWatch trains on up to 2 weeks of data, but anomaly detection can be enabled with less)

## Step 1: Create Anomaly Detection Alarm

```hcl
# Create a CloudWatch anomaly detection alarm for Lambda invocations

resource "aws_cloudwatch_metric_alarm" "lambda_anomaly" {
  alarm_name          = "${var.project_name}-lambda-invocation-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 3
  threshold_metric_id = "e1"  # References the anomaly band expression
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "e1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 2)"  # 2 standard deviations
    label       = "Lambda Invocations (Expected)"
    return_data = true
  }

  metric_query {
    id          = "m1"
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

  alarm_description = "Lambda invocations anomaly - traffic spike outside expected range"
  alarm_actions     = [var.sns_topic_arn]
  ok_actions        = [var.sns_topic_arn]

  tags = {
    Name = "${var.project_name}-lambda-anomaly"
  }
}
```

## Step 2: Anomaly Detection for Response Time

```hcl
# Detect unusual API Gateway latency
resource "aws_cloudwatch_metric_alarm" "api_latency_anomaly" {
  alarm_name          = "${var.project_name}-api-latency-anomaly"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 5
  threshold_metric_id = "e1"
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "e1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 3)"  # 3 standard deviations = more tolerance
    label       = "P99 Latency (Expected)"
    return_data = true
  }

  metric_query {
    id          = "m1"
    return_data = false
    metric {
      metric_name = "IntegrationLatency"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "p99"
      dimensions = {
        ApiName = var.api_name
        Stage   = "prod"
      }
    }
  }

  alarm_actions = [var.sns_topic_arn]
}
```

## Step 3: Anomaly Detection for Below Expected (Drop in Traffic)

```hcl
# Detect traffic drop which could indicate outage
resource "aws_cloudwatch_metric_alarm" "traffic_drop_anomaly" {
  alarm_name          = "${var.project_name}-traffic-drop"
  comparison_operator = "LessThanLowerThreshold"  # Below the expected band
  evaluation_periods  = 3
  threshold_metric_id = "e1"
  treat_missing_data  = "breaching"  # Missing data = traffic drop

  metric_query {
    id          = "e1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
    label       = "Request Count (Expected)"
    return_data = true
  }

  metric_query {
    id          = "m1"
    return_data = false
    metric {
      metric_name = "Count"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "SampleCount"
      dimensions = {
        ApiName = var.api_name
        Stage   = "prod"
      }
    }
  }

  alarm_description = "Traffic drop detected - possible service outage"
  alarm_actions     = [var.critical_sns_topic_arn]
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# View anomaly detection model details
aws cloudwatch describe-anomaly-detectors \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=my-function
```

## Conclusion

Anomaly Detection is most valuable for metrics with clear patterns-daily/weekly cycles, business hours variations, or growth trends. A new model can take up to 3 hours for the actual band to appear in graphs and up to 2 weeks to train for more accurate expected values. Use a higher standard deviation multiplier (2-3) for noisy metrics and lower (1-1.5) for stable metrics. Combine anomaly detection with absolute threshold alarms for defense in depth-anomaly detection catches unexpected deviations while absolute thresholds catch extreme violations.
