# How to Create Lambda with Provisioned Concurrency in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Provisioned Concurrency, Cold Start, Serverless, Performance, Infrastructure as Code

Description: Learn how to configure Lambda provisioned concurrency with Terraform to eliminate cold starts and ensure consistent low-latency performance for your functions.

---

Lambda cold starts happen when AWS needs to create a new execution environment for your function. During a cold start, Lambda downloads your code, starts the runtime, and runs initialization code before handling the request. This can add hundreds of milliseconds to seconds of latency, which is unacceptable for latency-sensitive workloads. Provisioned concurrency solves this by keeping a specified number of execution environments initialized and ready to respond instantly. This guide shows you how to configure provisioned concurrency with Terraform.

## How Provisioned Concurrency Works

When you configure provisioned concurrency, Lambda pre-initializes the specified number of execution environments. These environments are always warm and ready to handle requests with no cold start delay. You pay for provisioned concurrency whether or not the environments are handling requests, but the tradeoff is guaranteed sub-millisecond initialization latency.

Provisioned concurrency is configured on a specific function version or alias, not on the `$LATEST` version. This ensures that your provisioned environments run a known, stable version of your code.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- A Lambda function that you want to optimize for latency

## Lambda Function Setup

```hcl
provider "aws" {
  region = "us-east-1"
}

# IAM role for Lambda
resource "aws_iam_role" "lambda" {
  name = "lambda-provisioned-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda function
resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path

  # Source code hash for update detection
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 30
  memory_size = 512

  environment {
    variables = {
      NODE_ENV    = "production"
      DB_HOST     = var.db_host
      CACHE_HOST  = var.cache_host
    }
  }

  # Publish a version - required for provisioned concurrency
  publish = true

  tags = {
    Name        = "api-handler"
    Environment = "production"
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/lambda.zip"
}

variable "db_host" {
  type = string
}

variable "cache_host" {
  type = string
}
```

## Creating a Lambda Alias

Provisioned concurrency requires a published version or alias. Using an alias is recommended because you can update which version the alias points to without changing the provisioned concurrency configuration.

```hcl
# Create an alias pointing to the latest published version
resource "aws_lambda_alias" "live" {
  name             = "live"
  description      = "Live production alias"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version

  # Optional: weighted alias for canary deployments
  # routing_config {
  #   additional_version_weights = {
  #     "${aws_lambda_function.api.version}" = 0.1
  #   }
  # }
}
```

## Configuring Provisioned Concurrency

```hcl
# Provisioned concurrency on the alias
resource "aws_lambda_provisioned_concurrency_config" "api" {
  function_name                  = aws_lambda_function.api.function_name
  provisioned_concurrent_executions = 10  # Keep 10 environments warm
  qualifier                      = aws_lambda_alias.live.name
}
```

This configuration keeps 10 execution environments warm at all times. The first 10 concurrent requests will never experience a cold start.

## Auto Scaling Provisioned Concurrency

For workloads with predictable traffic patterns, you can auto scale provisioned concurrency.

```hcl
# Register the Lambda function as a scalable target
resource "aws_appautoscaling_target" "lambda" {
  max_capacity       = 50
  min_capacity       = 5
  resource_id        = "function:${aws_lambda_function.api.function_name}:${aws_lambda_alias.live.name}"
  scalable_dimension = "lambda:function:ProvisionedConcurrency"
  service_namespace  = "lambda"
}

# Target tracking policy based on utilization
resource "aws_appautoscaling_policy" "lambda_utilization" {
  name               = "lambda-provisioned-utilization"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.lambda.resource_id
  scalable_dimension = aws_appautoscaling_target.lambda.scalable_dimension
  service_namespace  = aws_appautoscaling_target.lambda.service_namespace

  target_tracking_scaling_policy_configuration {
    # Target 70% utilization of provisioned concurrency
    predefined_metric_specification {
      predefined_metric_type = "LambdaProvisionedConcurrencyUtilization"
    }

    target_value       = 0.7  # Scale when 70% of provisioned capacity is used
    scale_in_cooldown  = 300
    scale_out_cooldown = 60   # Scale out quickly
  }
}
```

## Scheduled Scaling for Predictable Patterns

If your traffic follows predictable patterns, use scheduled scaling.

```hcl
# Scale up during business hours
resource "aws_appautoscaling_scheduled_action" "scale_up" {
  name               = "lambda-scale-up-business-hours"
  service_namespace  = aws_appautoscaling_target.lambda.service_namespace
  resource_id        = aws_appautoscaling_target.lambda.resource_id
  scalable_dimension = aws_appautoscaling_target.lambda.scalable_dimension
  schedule           = "cron(0 8 ? * MON-FRI *)"

  scalable_target_action {
    min_capacity = 20
    max_capacity = 50
  }
}

# Scale down after business hours
resource "aws_appautoscaling_scheduled_action" "scale_down" {
  name               = "lambda-scale-down-after-hours"
  service_namespace  = aws_appautoscaling_target.lambda.service_namespace
  resource_id        = aws_appautoscaling_target.lambda.resource_id
  scalable_dimension = aws_appautoscaling_target.lambda.scalable_dimension
  schedule           = "cron(0 20 ? * MON-FRI *)"

  scalable_target_action {
    min_capacity = 5
    max_capacity = 20
  }
}

# Extra capacity for known high-traffic events
resource "aws_appautoscaling_scheduled_action" "scale_up_peak" {
  name               = "lambda-scale-up-peak"
  service_namespace  = aws_appautoscaling_target.lambda.service_namespace
  resource_id        = aws_appautoscaling_target.lambda.resource_id
  scalable_dimension = aws_appautoscaling_target.lambda.scalable_dimension
  schedule           = "cron(55 11 ? * MON-FRI *)"  # Before lunch rush

  scalable_target_action {
    min_capacity = 30
    max_capacity = 50
  }
}
```

## API Gateway with Alias Integration

Point API Gateway to the alias to use provisioned concurrency.

```hcl
# API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "provisioned-api"
  protocol_type = "HTTP"
}

# Lambda permission for the alias
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  qualifier     = aws_lambda_alias.live.name  # Point to the alias
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# Integration pointing to the alias ARN
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_alias.live.invoke_arn  # Use alias ARN
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}
```

## Monitoring Provisioned Concurrency

Track how well your provisioned concurrency is being utilized.

```hcl
# SNS topic for alerts
resource "aws_sns_topic" "lambda_alerts" {
  name = "lambda-provisioned-alerts"
}

# Alarm when provisioned concurrency is almost fully utilized
resource "aws_cloudwatch_metric_alarm" "provisioned_utilization_high" {
  alarm_name          = "lambda-provisioned-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 0.85
  alarm_description   = "Provisioned concurrency utilization is above 85%"
  alarm_actions       = [aws_sns_topic.lambda_alerts.arn]

  metric_query {
    id          = "utilization"
    expression  = "invocations / provisioned"
    label       = "Utilization"
    return_data = true
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "ProvisionedConcurrentExecutions"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Maximum"
      dimensions = {
        FunctionName = aws_lambda_function.api.function_name
        Resource     = "${aws_lambda_function.api.function_name}:${aws_lambda_alias.live.name}"
      }
    }
  }

  metric_query {
    id = "provisioned"
    metric {
      metric_name = "ProvisionedConcurrencyUtilization"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Maximum"
      dimensions = {
        FunctionName = aws_lambda_function.api.function_name
        Resource     = "${aws_lambda_function.api.function_name}:${aws_lambda_alias.live.name}"
      }
    }
  }
}

# Alarm for spillover invocations (requests exceeding provisioned capacity)
resource "aws_cloudwatch_metric_alarm" "spillover" {
  alarm_name          = "lambda-provisioned-spillover"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ProvisionedConcurrencySpilloverInvocations"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "Requests are spilling over to on-demand - consider increasing provisioned concurrency"
  alarm_actions       = [aws_sns_topic.lambda_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
    Resource     = "${aws_lambda_function.api.function_name}:${aws_lambda_alias.live.name}"
  }
}
```

## Outputs

```hcl
output "function_name" {
  value = aws_lambda_function.api.function_name
}

output "alias_arn" {
  value = aws_lambda_alias.live.arn
}

output "provisioned_concurrency" {
  value = aws_lambda_provisioned_concurrency_config.api.provisioned_concurrent_executions
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.main.api_endpoint
}
```

## Best Practices

When using provisioned concurrency, always use aliases rather than version numbers so you can update versions without reconfiguring provisioned concurrency. Start with a conservative number and use auto scaling to adjust based on demand. Monitor the ProvisionedConcurrencySpilloverInvocations metric to know when requests exceed your provisioned capacity. Use scheduled scaling for predictable traffic patterns to reduce costs. Remember that provisioned concurrency counts against your account's concurrency limits. Optimize your function's initialization code since it runs when provisioned environments are created.

## Monitoring with OneUptime

Even with provisioned concurrency, monitoring is essential. Use [OneUptime](https://oneuptime.com) to track your Lambda function latency, error rates, and cold start frequency to verify that provisioned concurrency is delivering the performance you expect.

## Conclusion

Provisioned concurrency eliminates Lambda cold starts for latency-sensitive workloads. With Terraform, you can configure the entire setup, from the function and alias to auto scaling policies and monitoring alarms, as reproducible infrastructure code. By combining target tracking auto scaling with scheduled actions, you can maintain optimal capacity while controlling costs.

For more Lambda configuration topics, see our guides on [Lambda with reserved concurrency](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-reserved-concurrency-in-terraform/view) and [Lambda with dead letter queues](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-dead-letter-queue-in-terraform/view).
