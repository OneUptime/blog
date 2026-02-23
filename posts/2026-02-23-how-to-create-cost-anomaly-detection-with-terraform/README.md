# How to Create Cost Anomaly Detection with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Anomaly Detection, FinOps, Cloud Cost Management, AWS Cost Explorer

Description: Learn how to set up automated cost anomaly detection with Terraform using AWS Cost Anomaly Detection, CloudWatch alarms, and custom alerting pipelines.

---

Cost anomalies - unexpected spikes or unusual patterns in cloud spending - are one of the most common causes of budget overruns. A misconfigured auto-scaling group, an accidental deployment to expensive instance types, or a sudden increase in data transfer can all lead to bills that are dramatically higher than expected. Detecting these anomalies early is critical, and Terraform lets you build the detection infrastructure as code.

This guide shows you how to create comprehensive cost anomaly detection using Terraform, covering both AWS-native tools and custom monitoring approaches.

## Understanding Cost Anomalies

Cost anomalies come in several forms. There are sudden spikes caused by misconfiguration, gradual drift from cost baselines that accumulates over time, and seasonal patterns that may look abnormal but are actually expected. A good anomaly detection system handles all of these cases while minimizing false positives.

## Setting Up AWS Cost Anomaly Detection

AWS Cost Anomaly Detection is a managed service that uses machine learning to identify unusual spending patterns. It learns your spending baseline automatically and alerts you when deviations occur.

```hcl
# Service-level anomaly monitor
# Monitors spending across all AWS services independently
resource "aws_ce_anomaly_monitor" "service_monitor" {
  name              = "service-level-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

# Custom monitor for specific cost allocation tags
resource "aws_ce_anomaly_monitor" "environment_monitor" {
  name         = "production-environment-monitor"
  monitor_type = "CUSTOM"

  monitor_specification = jsonencode({
    And            = null
    Or             = null
    Not            = null
    Dimensions     = null
    CostCategories = null
    Tags = {
      Key          = "Environment"
      Values       = ["production"]
      MatchOptions = ["EQUALS"]
    }
  })
}

# Team-based monitors for granular detection
resource "aws_ce_anomaly_monitor" "team_monitors" {
  for_each     = var.teams
  name         = "${each.key}-team-anomaly-monitor"
  monitor_type = "CUSTOM"

  monitor_specification = jsonencode({
    And            = null
    Or             = null
    Not            = null
    Dimensions     = null
    CostCategories = null
    Tags = {
      Key          = "Team"
      Values       = [each.key]
      MatchOptions = ["EQUALS"]
    }
  })
}

# Linked account monitor for multi-account setups
resource "aws_ce_anomaly_monitor" "account_monitor" {
  name         = "linked-account-anomaly-monitor"
  monitor_type = "CUSTOM"

  monitor_specification = jsonencode({
    And            = null
    Or             = null
    Not            = null
    Tags           = null
    CostCategories = null
    Dimensions = {
      Key          = "LINKED_ACCOUNT"
      Values       = var.monitored_account_ids
      MatchOptions = ["EQUALS"]
    }
  })
}
```

## Configuring Alert Subscriptions

Monitors detect anomalies, but subscriptions define how you get notified and what thresholds trigger alerts.

```hcl
# SNS topic for cost anomaly notifications
resource "aws_sns_topic" "cost_anomaly" {
  name = "cost-anomaly-alerts"
}

# Email subscriptions for the finance team
resource "aws_sns_topic_subscription" "finance_email" {
  for_each  = toset(var.finance_team_emails)
  topic_arn = aws_sns_topic.cost_anomaly.arn
  protocol  = "email"
  endpoint  = each.value
}

# Subscription for service-level anomalies
resource "aws_ce_anomaly_subscription" "service_alerts" {
  name      = "service-anomaly-alerts"
  frequency = "IMMEDIATE"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.service_monitor.arn,
  ]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_anomaly.arn
  }

  # Alert when anomaly impact exceeds $50
  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["50"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }
}

# Subscription for team-level anomalies with percentage threshold
resource "aws_ce_anomaly_subscription" "team_alerts" {
  name      = "team-anomaly-alerts"
  frequency = "DAILY"

  monitor_arn_list = [
    for m in aws_ce_anomaly_monitor.team_monitors : m.arn
  ]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_anomaly.arn
  }

  # Alert when anomaly exceeds both absolute and percentage thresholds
  threshold_expression {
    and {
      dimension {
        key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
        values        = ["100"]
        match_options = ["GREATER_THAN_OR_EQUAL"]
      }
    }
    and {
      dimension {
        key           = "ANOMALY_TOTAL_IMPACT_PERCENTAGE"
        values        = ["20"]
        match_options = ["GREATER_THAN_OR_EQUAL"]
      }
    }
  }
}
```

## Custom Anomaly Detection with CloudWatch

For more granular control, you can build custom anomaly detection using CloudWatch Anomaly Detection, which uses machine learning on your CloudWatch metrics.

```hcl
# CloudWatch anomaly detector for billing metrics
resource "aws_cloudwatch_metric_alarm" "billing_anomaly" {
  alarm_name          = "billing-anomaly-detection"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "notBreaching"
  alarm_description   = "Detected anomalous billing pattern"
  alarm_actions       = [aws_sns_topic.cost_anomaly.arn]

  # Use anomaly detection band
  threshold_metric_id = "ad1"

  metric_query {
    id          = "m1"
    return_data = true

    metric {
      metric_name = "EstimatedCharges"
      namespace   = "AWS/Billing"
      period      = 86400
      stat        = "Maximum"

      dimensions = {
        Currency = "USD"
      }
    }
  }

  metric_query {
    id          = "ad1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
    label       = "EstimatedCharges Anomaly Band"
    return_data = true
  }
}

# Per-service billing anomaly detection
resource "aws_cloudwatch_metric_alarm" "service_billing_anomaly" {
  for_each = toset(var.monitored_services)

  alarm_name          = "billing-anomaly-${lower(replace(each.value, " ", "-"))}"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "notBreaching"
  alarm_description   = "Anomalous billing for ${each.value}"
  alarm_actions       = [aws_sns_topic.cost_anomaly.arn]

  threshold_metric_id = "ad1"

  metric_query {
    id          = "m1"
    return_data = true

    metric {
      metric_name = "EstimatedCharges"
      namespace   = "AWS/Billing"
      period      = 86400
      stat        = "Maximum"

      dimensions = {
        Currency    = "USD"
        ServiceName = each.value
      }
    }
  }

  metric_query {
    id          = "ad1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
    label       = "${each.value} Anomaly Band"
    return_data = true
  }
}
```

## Building a Custom Alerting Pipeline

For organizations that need more sophisticated alerting, you can build a custom pipeline using Lambda and EventBridge.

```hcl
# Lambda function for custom anomaly processing
resource "aws_lambda_function" "anomaly_processor" {
  filename         = data.archive_file.anomaly_processor.output_path
  function_name    = "cost-anomaly-processor"
  role             = aws_iam_role.anomaly_processor.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 60
  source_code_hash = data.archive_file.anomaly_processor.output_base64sha256

  environment {
    variables = {
      SLACK_WEBHOOK_URL    = var.slack_webhook_url
      PAGERDUTY_KEY        = var.pagerduty_integration_key
      SEVERITY_THRESHOLD   = "500"
      ONCALL_THRESHOLD     = "2000"
    }
  }
}

# Subscribe Lambda to SNS topic
resource "aws_sns_topic_subscription" "anomaly_lambda" {
  topic_arn = aws_sns_topic.cost_anomaly.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.anomaly_processor.arn
}

resource "aws_lambda_permission" "sns_invoke" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.anomaly_processor.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.cost_anomaly.arn
}

# EventBridge rule for Cost Anomaly Detection events
resource "aws_cloudwatch_event_rule" "cost_anomaly_event" {
  name        = "cost-anomaly-event"
  description = "Capture AWS Cost Anomaly Detection events"

  event_pattern = jsonencode({
    source      = ["aws.ce"]
    detail-type = ["Cost Anomaly Detection Alert"]
  })
}

resource "aws_cloudwatch_event_target" "anomaly_lambda" {
  rule      = aws_cloudwatch_event_rule.cost_anomaly_event.name
  target_id = "CostAnomalyProcessor"
  arn       = aws_lambda_function.anomaly_processor.arn
}
```

## Creating a Cost Dashboard

A centralized dashboard makes it easy to spot trends and correlate anomalies with infrastructure changes.

```hcl
# CloudWatch dashboard for cost visibility
resource "aws_cloudwatch_dashboard" "cost_monitoring" {
  dashboard_name = "CostMonitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Total Estimated Charges"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", {
              stat   = "Maximum"
              period = 86400
            }]
          ]
          view    = "timeSeries"
          region  = "us-east-1"
          period  = 86400
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "Charges by Service"
          metrics = [
            for svc in var.monitored_services :
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", "ServiceName", svc, {
              stat   = "Maximum"
              period = 86400
            }]
          ]
          view   = "timeSeries"
          region = "us-east-1"
          period = 86400
        }
      }
    ]
  })
}
```

## Best Practices for Cost Anomaly Detection

Start with broad monitors at the service level and then add targeted monitors for specific teams and projects. Set reasonable thresholds that balance early detection with noise reduction. A $10 anomaly on a $50,000 monthly bill is not worth an alert, but a $500 anomaly on a $2,000 budget absolutely is.

Always pair anomaly detection with automated response capabilities. When an anomaly is detected, your pipeline should not just notify people but also provide context about what changed - recent deployments, new resources, or configuration changes.

For more on cost management, check out our guides on [implementing cost governance with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-governance-with-terraform/view) and [monitoring cloud spend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-monitor-cloud-spend-with-terraform/view).

## Conclusion

Cost anomaly detection is a critical component of any cloud cost management strategy. By using Terraform to deploy AWS Cost Anomaly Detection monitors, CloudWatch anomaly detection, and custom alerting pipelines, you create a multi-layered system that catches unusual spending patterns before they become budget disasters. The key is tuning your thresholds over time to reduce noise while maintaining sensitivity to genuinely concerning cost changes.
