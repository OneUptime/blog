# How to Set Up SNS Notifications and Alerts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SNS, Alerting, Notification, Infrastructure as Code

Description: Learn how to provision AWS SNS topics, subscriptions, and CloudWatch alarm integrations using OpenTofu for automated notifications and alerting.

## Introduction

Amazon Simple Notification Service (SNS) is a managed pub/sub messaging service. Using OpenTofu to configure SNS topics, subscriptions, and alarm integrations ensures your alerting infrastructure is reproducible, version-controlled, and consistent across environments.

## Creating an SNS Topic

```hcl
resource "aws_sns_topic" "alerts" {
  name = "application-alerts"

  tags = {
    Environment = var.environment
    Team        = "platform"
  }
}
```

## Adding Email Subscriptions

```hcl
resource "aws_sns_topic_subscription" "email_alert" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "ops-team@example.com"
}
```

## Adding an HTTP/HTTPS Webhook Subscription

HTTP/HTTPS endpoints must confirm the SNS subscription request. Use a webhook that automatically confirms SNS subscriptions, or confirm the `SubscribeURL` from the subscription confirmation message.

```hcl
resource "aws_sns_topic_subscription" "webhook" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = "https://hooks.example.com/alerts"
}
```

## Connecting SNS to CloudWatch Alarms

Define a CloudWatch alarm that sends notifications to SNS:

```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  alarm_description = "Alert when CPU exceeds 80% for 4 minutes"
}
```

## SNS Topic Policy for CloudWatch

Grant CloudWatch permission to publish to the SNS topic:

```hcl
resource "aws_sns_topic_policy" "cloudwatch_publish" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudwatch.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.alerts.arn
    }]
  })
}
```

## Deploying

```bash
tofu init
tofu plan
tofu apply
```

## Verifying

After deployment, confirm pending subscriptions in the AWS console. Email subscribers will receive a confirmation email they must click, and HTTP/HTTPS endpoints must confirm the SNS subscription request before notifications are delivered. Test by publishing a message:

```bash
aws sns publish \
  --topic-arn <your-topic-arn> \
  --message "Test alert from OpenTofu"
```

## Conclusion

OpenTofu makes it straightforward to manage SNS topics, subscriptions, and CloudWatch integrations as code. This approach ensures your alerting configuration is consistent, documented, and easily replicated across accounts and regions.
