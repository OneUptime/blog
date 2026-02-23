# How to Create Cost Alerts for Serverless with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Serverless, Cost Alerts, Lambda, API Gateway, AWS Budget

Description: Learn how to create cost alerts for serverless workloads with Terraform to catch runaway Lambda invocations, API Gateway overuse, and unexpected charges.

---

Serverless architectures promise cost efficiency through pay-per-use pricing, but that same model can lead to surprising bills when something goes wrong. A runaway Lambda function, an infinite loop between services, or an unexpected traffic spike can generate thousands of dollars in charges within hours. Proactive cost alerting is essential for serverless workloads, and Terraform makes it straightforward to set up comprehensive monitoring.

This guide covers practical Terraform configurations for creating cost alerts specific to serverless services including Lambda, API Gateway, DynamoDB, and Step Functions.

## Understanding Serverless Cost Risks

Serverless costs are driven by invocation count, execution duration, memory allocation, and data transfer. Unlike traditional infrastructure where costs are relatively predictable, serverless costs can spike dramatically in response to traffic changes or bugs. The most common risks include infinite recursion between Lambda functions, over-provisioned memory, excessive API Gateway requests, and DynamoDB read/write spikes.

## Lambda Invocation Alerts

Monitor Lambda invocation counts to catch runaway functions before they generate large bills.

```hcl
# CloudWatch alarm for Lambda invocation count spikes
resource "aws_cloudwatch_metric_alarm" "lambda_invocations" {
  for_each = var.monitored_lambda_functions

  alarm_name          = "high-invocations-${each.key}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Invocations"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = each.value.max_invocations_per_5min
  alarm_description   = "Lambda ${each.key} invocations exceeded threshold"
  alarm_actions       = [aws_sns_topic.serverless_alerts.arn]

  dimensions = {
    FunctionName = each.key
  }
}

# CloudWatch alarm for Lambda duration (cost is proportional to duration)
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  for_each = var.monitored_lambda_functions

  alarm_name          = "high-duration-${each.key}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = each.value.max_avg_duration_ms
  alarm_description   = "Lambda ${each.key} average duration exceeded threshold"
  alarm_actions       = [aws_sns_topic.serverless_alerts.arn]

  dimensions = {
    FunctionName = each.key
  }
}

# CloudWatch alarm for Lambda concurrent executions
resource "aws_cloudwatch_metric_alarm" "lambda_concurrency" {
  alarm_name          = "high-lambda-concurrency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConcurrentExecutions"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Maximum"
  threshold           = var.max_concurrent_executions
  alarm_description   = "Lambda concurrent executions are unusually high"
  alarm_actions       = [aws_sns_topic.serverless_alerts.arn]
}

# SNS topic for serverless cost alerts
resource "aws_sns_topic" "serverless_alerts" {
  name = "serverless-cost-alerts-${var.environment}"
}

resource "aws_sns_topic_subscription" "serverless_email" {
  for_each  = toset(var.alert_emails)
  topic_arn = aws_sns_topic.serverless_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}
```

## Lambda Throttling as a Cost Control

Setting reserved concurrency limits on Lambda functions prevents runaway costs by capping the maximum number of simultaneous executions.

```hcl
# Lambda function with reserved concurrency to limit costs
resource "aws_lambda_function" "api_handler" {
  filename         = var.lambda_package
  function_name    = "api-handler-${var.environment}"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30

  # Right-size memory to optimize cost
  # Lambda CPU scales with memory, find the sweet spot
  memory_size = 256

  # Limit concurrency to cap maximum cost
  reserved_concurrent_executions = var.environment == "production" ? 100 : 10

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = {
    Environment = var.environment
    CostCenter  = var.cost_center
  }
}

# Provisioned concurrency for predictable workloads (more cost-effective than on-demand at scale)
resource "aws_lambda_provisioned_concurrency_config" "api" {
  count = var.environment == "production" ? 1 : 0

  function_name                  = aws_lambda_function.api_handler.function_name
  provisioned_concurrent_executions = 5
  qualifier                      = aws_lambda_alias.live.name
}
```

## API Gateway Cost Monitoring

API Gateway charges per request and for data transfer. Monitor both to catch unexpected spikes.

```hcl
# CloudWatch alarm for API Gateway request count
resource "aws_cloudwatch_metric_alarm" "api_requests" {
  alarm_name          = "high-api-requests-${var.api_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Count"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = var.max_api_requests_per_5min
  alarm_description   = "API Gateway request count exceeded threshold"
  alarm_actions       = [aws_sns_topic.serverless_alerts.arn]

  dimensions = {
    ApiName = var.api_name
  }
}

# CloudWatch alarm for API Gateway 4xx errors (may indicate attack)
resource "aws_cloudwatch_metric_alarm" "api_4xx" {
  alarm_name          = "high-4xx-errors-${var.api_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "High 4xx error rate may indicate an attack driving up costs"
  alarm_actions       = [aws_sns_topic.serverless_alerts.arn]

  dimensions = {
    ApiName = var.api_name
  }
}

# Usage plan for API Gateway to enforce rate limiting
resource "aws_api_gateway_usage_plan" "cost_controlled" {
  name        = "cost-controlled-plan"
  description = "Rate-limited usage plan to control costs"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  throttle_settings {
    burst_limit = 100
    rate_limit  = 50
  }

  quota_settings {
    limit  = 100000
    period = "DAY"
  }
}
```

## Budget Alerts for Serverless Services

Set up dedicated budgets for serverless services to track overall spending trends.

```hcl
# Budget for Lambda
resource "aws_budgets_budget" "lambda_budget" {
  name              = "lambda-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.lambda_monthly_budget
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  cost_filter {
    name   = "Service"
    values = ["AWS Lambda"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 50
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
    subscriber_sns_topic_arns = [aws_sns_topic.serverless_alerts.arn]
  }
}

# Combined serverless budget
resource "aws_budgets_budget" "serverless_budget" {
  name              = "serverless-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.serverless_monthly_budget
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  cost_filter {
    name = "Service"
    values = [
      "AWS Lambda",
      "Amazon API Gateway",
      "AWS Step Functions",
      "Amazon DynamoDB",
      "Amazon Simple Queue Service",
    ]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = var.alert_emails
    subscriber_sns_topic_arns = [aws_sns_topic.serverless_alerts.arn]
  }
}
```

## Composite Alarms for Better Signal

Combine multiple alarms to reduce noise and catch genuine cost issues.

```hcl
# Composite alarm: high invocations AND high duration together
resource "aws_cloudwatch_composite_alarm" "lambda_cost_spike" {
  alarm_name        = "lambda-cost-spike-composite"
  alarm_description = "Lambda function is both highly invoked and running long - likely cost spike"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.lambda_invocations["api-handler"].alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.lambda_duration["api-handler"].alarm_name})"

  alarm_actions = [aws_sns_topic.serverless_alerts.arn]
}
```

## Best Practices

Always set reserved concurrency on Lambda functions, even if the limit is generous. It is far better to throttle excess traffic than to process it and pay for it. Use API Gateway usage plans to enforce rate limits on all APIs. Monitor not just invocation counts but also duration, error rates, and concurrent executions, as all of these affect costs.

Right-size Lambda memory allocations by testing with tools like AWS Lambda Power Tuning. Sometimes increasing memory actually reduces cost because the function runs faster.

For more on cost management, see our guides on [monitoring cloud spend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-monitor-cloud-spend-with-terraform/view) and [cost anomaly detection with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cost-anomaly-detection-with-terraform/view).

## Conclusion

Serverless cost alerting is not optional - it is a critical safety net. The pay-per-use model that makes serverless attractive also makes it vulnerable to unexpected cost spikes. By implementing invocation alerts, duration monitoring, concurrency limits, and budget controls with Terraform, you create multiple layers of protection against runaway serverless costs. Start with broad budget alerts and progressively add function-level monitoring as your serverless footprint grows.
