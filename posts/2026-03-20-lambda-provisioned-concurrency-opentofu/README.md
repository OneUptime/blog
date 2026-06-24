# How to Configure Lambda Provisioned Concurrency with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Provisioned Concurrency, Cold Start, Performance, Infrastructure as Code

Description: Learn how to configure Lambda Provisioned Concurrency using OpenTofu to eliminate cold starts and ensure consistent low-latency response times for latency-sensitive functions.

## Introduction

Lambda cold starts occur when a new execution environment is initialized for a function invocation. Provisioned Concurrency pre-initializes a specified number of execution environments, ensuring that level of concurrency is ready to respond immediately without the initialization delay. This is critical for latency-sensitive APIs.

## Prerequisites

- OpenTofu v1.6+
- An existing Lambda function
- Lambda function versions or aliases (required for provisioned concurrency)

## Step 1: Create a Lambda Function with Versioning

```hcl
resource "aws_lambda_function" "api" {
  function_name = "latency-sensitive-api"
  role          = var.lambda_role_arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256
  memory_size   = 1024
  timeout       = 30

  # publish = true creates a new version on each change
  publish = true

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}
```

## Step 2: Create a Lambda Alias

```hcl
# Create a "live" alias pointing to the latest published version

# Provisioned concurrency is configured on aliases or specific versions
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version

  description = "Live production alias with provisioned concurrency"
}
```

## Step 3: Configure Provisioned Concurrency

```hcl
# Pre-initialize 10 execution environments for the live alias
resource "aws_lambda_provisioned_concurrency_config" "live" {
  function_name                     = aws_lambda_function.api.function_name
  qualifier                         = aws_lambda_alias.live.name
  provisioned_concurrent_executions = 10

  # Application Auto Scaling will adjust this value after the initial setup
  lifecycle {
    ignore_changes = [provisioned_concurrent_executions]
  }

  # Wait for provisioned concurrency to be fully ready before apply completes
  # This can take several minutes for large numbers of executions
  timeouts {
    create = "10m"
    update = "10m"
  }
}
```

## Step 4: Configure Auto Scaling for Provisioned Concurrency

```hcl
# Register the Lambda alias as an auto-scaling target
resource "aws_appautoscaling_target" "lambda" {
  max_capacity       = 100
  min_capacity       = 10
  resource_id        = "function:${aws_lambda_function.api.function_name}:${aws_lambda_alias.live.name}"
  scalable_dimension = "lambda:function:ProvisionedConcurrency"
  service_namespace  = "lambda"

  # Lambda requires an initial provisioned concurrency value before auto scaling
  depends_on = [aws_lambda_provisioned_concurrency_config.live]
}

# Scale provisioned concurrency based on utilization
resource "aws_appautoscaling_policy" "lambda" {
  name               = "lambda-provisioned-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.lambda.resource_id
  scalable_dimension = aws_appautoscaling_target.lambda.scalable_dimension
  service_namespace  = aws_appautoscaling_target.lambda.service_namespace

  target_tracking_scaling_policy_configuration {
    # Keep utilization at 70% to allow headroom for burst traffic
    target_value = 0.7
    predefined_metric_specification {
      predefined_metric_type = "LambdaProvisionedConcurrencyUtilization"
    }
  }
}
```

## Step 5: Schedule Scale-Down During Off-Hours

```hcl
# Reduce provisioned concurrency during low-traffic hours to save costs
resource "aws_appautoscaling_scheduled_action" "scale_down_night" {
  name               = "scale-down-night"
  service_namespace  = aws_appautoscaling_target.lambda.service_namespace
  resource_id        = aws_appautoscaling_target.lambda.resource_id
  scalable_dimension = aws_appautoscaling_target.lambda.scalable_dimension
  schedule           = "cron(0 22 * * ? *)"  # 10 PM UTC every day

  scalable_target_action {
    min_capacity = 2
    max_capacity = 10
  }
}

resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  name               = "scale-up-morning"
  service_namespace  = aws_appautoscaling_target.lambda.service_namespace
  resource_id        = aws_appautoscaling_target.lambda.resource_id
  scalable_dimension = aws_appautoscaling_target.lambda.scalable_dimension
  schedule           = "cron(0 7 * * ? *)"  # 7 AM UTC every day

  scalable_target_action {
    min_capacity = 10
    max_capacity = 100
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Provisioned Concurrency helps avoid cold starts for the configured concurrency level by pre-warming execution environments. Configure auto-scaling to adjust the count based on utilization, and use scheduled scaling to reduce costs during off-peak hours. If traffic exceeds the provisioned amount, Lambda uses on-demand environments for the excess. Note that provisioned concurrency is billed per execution-hour even when idle, so balance cold start requirements against cost using the auto-scaling target tracking policy.
