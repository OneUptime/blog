# How to Set Up API Gateway Stages and Deployments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Stage, Deployment, Environment, Infrastructure as Code

Description: Learn how to manage API Gateway stages and deployments with OpenTofu to maintain separate environments (dev, staging, prod) and control API rollouts.

## Introduction

API Gateway stages are named references to your API deployments. Multiple stages can exist simultaneously (dev, staging, prod), each with its own URL, throttling settings, logging configuration, and stage variables. Deployments are snapshots of the API configuration; a stage points to a specific deployment. Managing this in OpenTofu requires careful use of `create_before_destroy` lifecycle rules to avoid downtime during updates.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with API Gateway permissions
- If you enable execution logging, API Gateway account-level CloudWatch logging permissions configured with `cloudWatchRoleArn`

## Step 1: Multiple Stages for Environments

```hcl
resource "aws_api_gateway_rest_api" "main" {
  name = "${var.project_name}-api"
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  # Force a new deployment when dependent API configuration changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.main,
      aws_api_gateway_method.main,
      aws_api_gateway_integration.main,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Production stage

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"

  access_log_settings {
    destination_arn = var.cloudwatch_log_group_arn
    format = jsonencode({
      requestId = "$context.requestId"
      ip        = "$context.identity.sourceIp"
      status    = "$context.status"
      duration  = "$context.responseLatency"
    })
  }

  xray_tracing_enabled = true

  variables = {
    lambdaAlias = "prod"
    environment = "production"
  }
}

# Staging stage
resource "aws_api_gateway_stage" "staging" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "staging"

  variables = {
    lambdaAlias = "staging"
    environment = "staging"
  }
}
```

## Step 2: Stage Method Settings

```hcl
resource "aws_api_gateway_method_settings" "prod" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"  # Apply to all methods

  settings {
    metrics_enabled        = true
    logging_level          = "INFO"  # OFF, ERROR, or INFO
    data_trace_enabled     = false   # Don't log full request/response (PII risk)
    throttling_rate_limit  = 10000   # Requests per second
    throttling_burst_limit = 5000
    caching_enabled        = false
  }
}
```

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply

# Get stage details
aws apigateway get-stage \
  --rest-api-id <api-id> \
  --stage-name prod

# REST API invoke URL format:
# https://<api-id>.execute-api.<region>.amazonaws.com/prod/

# List deployments
aws apigateway get-deployments \
  --rest-api-id <api-id> \
  --output table
```

## Conclusion

Use `triggers` with `sha1(jsonencode(...))` in the deployment resource to automatically create new deployments when the dependent API resources, methods, or integrations change; without this, OpenTofu won't detect API configuration changes that require redeployment. The `create_before_destroy = true` lifecycle helps OpenTofu create the replacement deployment before removing the previous one, which avoids API Gateway redeployment errors and service interruption. Stage variables allow the same API configuration to behave differently across environments when your integrations or mapping templates reference those variables.
