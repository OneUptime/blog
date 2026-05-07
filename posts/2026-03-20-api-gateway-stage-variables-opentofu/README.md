# How to Configure API Gateway Stage Variables with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Stage Variables, Multi-Environment, Configuration, Infrastructure as Code

Description: Learn how to configure API Gateway stage variables with OpenTofu to parameterize Lambda function aliases, backend URLs, and other environment-specific settings across stages.

## Introduction

API Gateway stage variables act as environment variables for API stages, allowing the same API configuration to point to different Lambda function aliases, backend URLs, or other settings per environment. This enables deploying one API with `${stageVariables.lambdaAlias}` that resolves to `dev`, `staging`, or `prod` depending on the stage.

## Prerequisites

- OpenTofu v1.6+
- An existing API Gateway REST API
- API Gateway CloudWatch Logs permissions configured if you enable `access_log_settings`
- AWS credentials with API Gateway and Lambda permissions

## Step 1: Create API Stage with Stage Variables

```hcl
# Production stage with prod-specific variables

resource "aws_api_gateway_stage" "prod" {
  deployment_id = var.deployment_id
  rest_api_id   = var.api_gateway_id
  stage_name    = "prod"

  variables = {
    lambdaAlias   = "prod"           # Lambda alias to invoke
    backendUrl    = "https://api.internal.prod.example.com"
    logLevel      = "ERROR"
    featureFlag   = "true"
    throttleLimit = "1000"
  }

  access_log_settings {
    destination_arn = var.prod_log_group_arn
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

  xray_tracing_enabled = true

  tags = {
    Name = "${var.project_name}-api-prod"
  }
}

# Staging stage with different variables
resource "aws_api_gateway_stage" "staging" {
  deployment_id = var.deployment_id
  rest_api_id   = var.api_gateway_id
  stage_name    = "staging"

  variables = {
    lambdaAlias   = "staging"
    backendUrl    = "https://api.internal.staging.example.com"
    logLevel      = "DEBUG"
    featureFlag   = "false"
    throttleLimit = "100"
  }

  access_log_settings {
    destination_arn = var.staging_log_group_arn
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
    Name = "${var.project_name}-api-staging"
  }
}
```

## Step 2: Use Stage Variables in Lambda Integration

```hcl
# Integration using stage variable for Lambda alias
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = var.api_gateway_id
  resource_id             = var.resource_id
  http_method             = "ANY"
  integration_http_method = "POST"
  type                    = "AWS_PROXY"

  # ${stageVariables.lambdaAlias} resolves at runtime to the stage variable value
  uri = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.region}:${data.aws_caller_identity.current.account_id}:function:${var.lambda_function_name}:$${stageVariables.lambdaAlias}/invocations"
}
```

## Step 3: Grant Lambda Permissions for Each Alias/Stage

```hcl
# Permissions must be granted for each alias that API Gateway will invoke
resource "aws_lambda_permission" "api_prod" {
  statement_id  = "AllowAPIGatewayProd"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  qualifier     = "prod"  # Lambda alias
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/prod/*/*"
}

resource "aws_lambda_permission" "api_staging" {
  statement_id  = "AllowAPIGatewayStaging"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  qualifier     = "staging"  # Lambda alias
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/staging/*/*"
}
```

## Step 4: Read Stage Variables in Lambda Handler

```python
def handler(event, context):
    # Stage variables are passed in the event object
    stage_variables = event.get('stageVariables') or {}
    log_level = stage_variables.get('logLevel', 'INFO')
    feature_flag = stage_variables.get('featureFlag', 'false') == 'true'

    print(f"Log level: {log_level}, Feature flag: {feature_flag}")

    return {
        'statusCode': 200,
        'body': 'OK'
    }
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify stage variables
aws apigateway get-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --query 'variables'
```

## Conclusion

Stage variables enable a single API Gateway configuration to serve multiple environments by parameterizing environment-specific values like Lambda aliases, backend URLs, and feature flags. The pattern of using `${stageVariables.lambdaAlias}` in integration URIs with Lambda aliases allows blue/green or canary deployments of Lambda functions independently per environment.
