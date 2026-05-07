# How to Configure API Gateway Caching with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Caching, Performance, Cost Optimization, Infrastructure as Code

Description: Learn how to configure API Gateway response caching with OpenTofu to reduce backend invocations, improve response times, and lower costs for read-heavy APIs.

## Introduction

API Gateway caching stores responses from your integration endpoint for a configurable TTL (up to 3600 seconds). Cached responses are served directly from API Gateway without invoking Lambda or hitting backend services, reducing latency and significantly cutting backend costs for frequently accessed resources.

## Prerequisites

- OpenTofu v1.6+
- An existing API Gateway REST API deployment
- AWS credentials with API Gateway permissions

## Step 1: Enable Caching on API Stage

```hcl
resource "aws_api_gateway_stage" "prod" {
  deployment_id = var.deployment_id
  rest_api_id   = var.api_gateway_id
  stage_name    = "prod"

  # Enable stage-level caching
  cache_cluster_enabled = true
  cache_cluster_size    = "0.5"  # Cache size in GB: 0.5, 1.6, 6.1, 13.5, 28.4, 58.2, 118, 237

  xray_tracing_enabled = true

  access_log_settings {
    destination_arn = var.cloudwatch_log_group_arn
    format = jsonencode({
      requestId         = "$context.requestId"
      extendedRequestId = "$context.extendedRequestId"
      ip                = "$context.identity.sourceIp"
      requestTime       = "$context.requestTime"
      httpMethod        = "$context.httpMethod"
      resourcePath      = "$context.resourcePath"
      status            = "$context.status"
      responseLength    = "$context.responseLength"
    })
  }

  tags = {
    Name = "${var.project_name}-api-prod"
  }
}
```

## Step 2: Configure Per-Method Cache Settings

```hcl
# Method settings control caching behavior per endpoint

resource "aws_api_gateway_method_settings" "cached_get" {
  rest_api_id = var.api_gateway_id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "users/GET"  # Format: {resource_path}/{HTTP_METHOD}

  settings {
    metrics_enabled        = true
    logging_level          = "INFO"
    data_trace_enabled     = false

    # Caching settings for this specific method
    caching_enabled                = true
    cache_ttl_in_seconds           = 300  # Cache for 5 minutes
    cache_data_encrypted           = true

    # Allow any client to refresh the cache with Cache-Control: max-age=0
    require_authorization_for_cache_control = false
  }
}

# Disable caching for write methods
resource "aws_api_gateway_method_settings" "no_cache_post" {
  rest_api_id = var.api_gateway_id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "users/POST"

  settings {
    metrics_enabled  = true
    logging_level    = "INFO"
    caching_enabled  = false  # Never cache POST requests
  }
}

# All methods default settings
resource "aws_api_gateway_method_settings" "all_methods" {
  rest_api_id = var.api_gateway_id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"  # Applies to all methods

  settings {
    metrics_enabled        = true
    logging_level          = "ERROR"
    throttling_burst_limit = 5000
    throttling_rate_limit  = 1000
  }
}
```

## Step 3: Use Cache Keys with Request Parameters

```hcl
# Include query parameters in the cache key
resource "aws_api_gateway_method" "get_user" {
  rest_api_id   = var.api_gateway_id
  resource_id   = var.user_id_resource_id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.userId"      = true   # Required path param
    "method.request.querystring.fields" = false  # Optional query param
  }
}

# Configure which parameters are included in the cache key
resource "aws_api_gateway_method_settings" "get_user_cached" {
  rest_api_id = var.api_gateway_id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "users/{userId}/GET"

  settings {
    caching_enabled      = true
    cache_ttl_in_seconds = 600
    cache_data_encrypted = true
  }
}

resource "aws_api_gateway_integration" "get_user" {
  rest_api_id             = var.api_gateway_id
  resource_id             = var.user_id_resource_id
  http_method             = aws_api_gateway_method.get_user.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn

  cache_key_parameters = [
    "method.request.path.userId",
    "method.request.querystring.fields"
  ]
  cache_namespace = "user-cache"
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Manually flush the entire stage cache
aws apigateway flush-stage-cache \
  --rest-api-id <api-id> \
  --stage-name prod
```

## Conclusion

API Gateway caching provides the biggest performance and cost improvement for read-heavy endpoints with stable data. Size the cache cluster based on your unique cache keys and response sizes. Start with 0.5 GB and use `CacheHitCount` and `CacheMissCount` during load testing to decide whether to scale up. Always encrypt cache data in production and include relevant path/query parameters in cache keys to avoid serving stale data to different users.
