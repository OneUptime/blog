# How to Monitor SNS with CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SNS, CloudWatch, Monitoring

Description: A complete guide to monitoring Amazon SNS topics with CloudWatch metrics, alarms, and dashboards for reliable message delivery tracking.

---

Amazon SNS is one of those services that seems simple until something goes wrong. Messages aren't delivered, subscribers lag behind, or your publish rate drops and you have no idea why. The good news is that SNS publishes detailed metrics to CloudWatch automatically. You just need to know which metrics to watch and how to set up alarms that actually catch problems before your users do.

## Key SNS Metrics

SNS publishes several metrics to CloudWatch. Let's break down the ones that matter most.

**NumberOfMessagesPublished**: Total messages published to a topic. This is your throughput indicator. If it drops unexpectedly, your producers might be having issues.

**NumberOfNotificationsDelivered**: Messages successfully delivered to subscribers. Compare this against published messages to spot delivery problems.

**NumberOfNotificationsFailed**: Failed delivery attempts. This is the most critical metric to alarm on. Any persistent failures mean messages are being lost.

**PublishSize**: The size of published messages in bytes. Useful for tracking whether message sizes are creeping toward the 256 KB limit.

**SMSSuccessRate**: Only relevant if you're using SNS for SMS. Tracks the percentage of SMS messages delivered successfully.

## Setting Up CloudWatch Alarms

Let's create alarms for the metrics that matter most. Start with delivery failures - that's the one you absolutely can't miss.

This Terraform configuration creates a CloudWatch alarm that fires when SNS delivery failures exceed zero for 5 minutes.

```hcl
resource "aws_cloudwatch_metric_alarm" "sns_delivery_failures" {
  alarm_name          = "sns-delivery-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "NumberOfNotificationsFailed"
  namespace           = "AWS/SNS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "SNS delivery failures detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TopicName = "order-events"
  }
}
```

Now let's add an alarm for when publishing drops below the expected baseline. If you normally publish 100 messages per minute and that drops to zero, something is broken.

This alarm detects when the publish rate drops below the expected minimum.

```hcl
resource "aws_cloudwatch_metric_alarm" "sns_publish_drop" {
  alarm_name          = "sns-publish-rate-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "NumberOfMessagesPublished"
  namespace           = "AWS/SNS"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "SNS publish rate dropped below expected minimum"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    TopicName = "order-events"
  }
}
```

Notice the `treat_missing_data = "breaching"` setting. If CloudWatch isn't receiving any data points at all, we want the alarm to fire because that likely means zero messages are being published.

## Monitoring Per-Subscriber Delivery

SNS metrics can be filtered by protocol (HTTP, SQS, Lambda, etc.), which lets you see which delivery channels are having issues.

This Python script checks delivery success by protocol for a specific topic.

```python
import boto3
from datetime import datetime, timedelta

cloudwatch = boto3.client("cloudwatch")

def get_delivery_stats(topic_name, hours=1):
    """Get delivery stats per protocol for an SNS topic."""
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours)

    protocols = ["sqs", "lambda", "http", "https"]

    for protocol in protocols:
        # Get delivered count
        delivered = cloudwatch.get_metric_statistics(
            Namespace="AWS/SNS",
            MetricName="NumberOfNotificationsDelivered",
            Dimensions=[
                {"Name": "TopicName", "Value": topic_name},
                {"Name": "Protocol", "Value": protocol}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=["Sum"]
        )

        # Get failed count
        failed = cloudwatch.get_metric_statistics(
            Namespace="AWS/SNS",
            MetricName="NumberOfNotificationsFailed",
            Dimensions=[
                {"Name": "TopicName", "Value": topic_name},
                {"Name": "Protocol", "Value": protocol}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=["Sum"]
        )

        delivered_count = sum(
            dp["Sum"] for dp in delivered["Datapoints"]
        )
        failed_count = sum(
            dp["Sum"] for dp in failed["Datapoints"]
        )

        if delivered_count > 0 or failed_count > 0:
            success_rate = delivered_count / (delivered_count + failed_count) * 100
            print(f"{protocol}: {delivered_count} delivered, "
                  f"{failed_count} failed ({success_rate:.1f}% success)")

get_delivery_stats("order-events")
```

## Building a CloudWatch Dashboard

A dashboard gives you a single pane of glass for all your SNS metrics. Here's how to create one that covers the essential views.

This CloudFormation snippet creates a dashboard with publish rate, delivery rate, and failure metrics.

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Messages Published (per minute)",
        "metrics": [
          ["AWS/SNS", "NumberOfMessagesPublished", "TopicName", "order-events", {"stat": "Sum", "period": 60}],
          ["AWS/SNS", "NumberOfMessagesPublished", "TopicName", "payment-events", {"stat": "Sum", "period": 60}]
        ],
        "view": "timeSeries",
        "region": "us-east-1",
        "period": 60
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Delivery Success vs Failures",
        "metrics": [
          ["AWS/SNS", "NumberOfNotificationsDelivered", "TopicName", "order-events", {"stat": "Sum", "period": 300, "color": "#2ca02c"}],
          ["AWS/SNS", "NumberOfNotificationsFailed", "TopicName", "order-events", {"stat": "Sum", "period": 300, "color": "#d62728"}]
        ],
        "view": "timeSeries",
        "region": "us-east-1"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Message Size Distribution",
        "metrics": [
          ["AWS/SNS", "PublishSize", "TopicName", "order-events", {"stat": "Average", "period": 300}],
          ["AWS/SNS", "PublishSize", "TopicName", "order-events", {"stat": "Maximum", "period": 300}]
        ],
        "view": "timeSeries",
        "region": "us-east-1"
      }
    }
  ]
}
```

You can create this dashboard using the AWS CLI.

```bash
aws cloudwatch put-dashboard \
  --dashboard-name "SNS-Monitoring" \
  --dashboard-body file://dashboard.json
```

## Setting Up SNS Delivery Status Logging

CloudWatch metrics tell you that deliveries failed, but they don't tell you why. Enable delivery status logging to get detailed failure reasons in CloudWatch Logs.

This Terraform configuration enables delivery status logging for SQS and Lambda subscribers.

```hcl
resource "aws_sns_topic" "order_events" {
  name = "order-events"

  # Enable delivery status logging for SQS
  sqs_success_feedback_role_arn    = aws_iam_role.sns_logging.arn
  sqs_failure_feedback_role_arn    = aws_iam_role.sns_logging.arn
  sqs_success_feedback_sample_rate = 100

  # Enable delivery status logging for Lambda
  lambda_success_feedback_role_arn    = aws_iam_role.sns_logging.arn
  lambda_failure_feedback_role_arn    = aws_iam_role.sns_logging.arn
  lambda_success_feedback_sample_rate = 100

  # Enable delivery status logging for HTTP
  http_success_feedback_role_arn    = aws_iam_role.sns_logging.arn
  http_failure_feedback_role_arn    = aws_iam_role.sns_logging.arn
  http_success_feedback_sample_rate = 50  # Sample 50% of successes to save costs
}

resource "aws_iam_role" "sns_logging" {
  name = "sns-delivery-logging"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "sns.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "sns_logging" {
  name = "sns-delivery-logging"
  role = aws_iam_role.sns_logging.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:PutMetricFilter",
        "logs:PutRetentionPolicy"
      ]
      Resource = "*"
    }]
  })
}
```

Once enabled, you can search the logs for failure details.

```bash
# Search for delivery failures in the last hour
aws logs filter-log-events \
  --log-group-name "sns/us-east-1/123456789/order-events/Failure" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "FAILURE"
```

## Creating a Metric Filter for Custom Alerts

Sometimes the built-in metrics aren't granular enough. You can create metric filters on the delivery status logs to extract custom metrics.

This filter extracts a metric for HTTP delivery timeouts specifically.

```bash
aws logs put-metric-filter \
  --log-group-name "sns/us-east-1/123456789/order-events/Failure" \
  --filter-name "http-delivery-timeout" \
  --filter-pattern '{ $.delivery.statusCode = "408" }' \
  --metric-transformations \
    metricName=SNSHttpDeliveryTimeout,metricNamespace=Custom/SNS,metricValue=1
```

## Anomaly Detection

For topics with variable traffic patterns (like e-commerce that peaks during business hours), static thresholds can generate false alarms. CloudWatch anomaly detection learns your traffic pattern and alerts when behavior deviates.

```hcl
resource "aws_cloudwatch_metric_alarm" "sns_anomaly" {
  alarm_name          = "sns-publish-anomaly"
  comparison_operator = "LessThanLowerOrGreaterThanUpperThreshold"
  evaluation_periods  = 3
  threshold_metric_id = "ad1"
  alarm_description   = "SNS publish rate is outside expected range"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  metric_query {
    id          = "m1"
    return_data = true

    metric {
      metric_name = "NumberOfMessagesPublished"
      namespace   = "AWS/SNS"
      period      = 300
      stat        = "Sum"

      dimensions = {
        TopicName = "order-events"
      }
    }
  }

  metric_query {
    id          = "ad1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
    label       = "Expected range"
    return_data = true
  }
}
```

## Wrapping Up

Monitoring SNS effectively comes down to three things: watch the right metrics (especially delivery failures), enable delivery status logging for debugging, and build dashboards that give you the full picture at a glance. Set up alarms for both failure conditions and traffic anomalies, and you'll catch problems before they affect your users. If you're building a larger event-driven system, pair this monitoring with [SQS and EventBridge observability](https://oneuptime.com/blog/post/2026-02-12-event-driven-architecture-sqs-sns-eventbridge/view) for end-to-end visibility.
