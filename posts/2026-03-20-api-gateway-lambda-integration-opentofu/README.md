# How to Set Up API Gateway Lambda Integration with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Lambda, Proxy Integration, Serverless, Infrastructure as Code

Description: Learn how to configure API Gateway Lambda proxy integration with OpenTofu to route HTTP requests directly to Lambda functions with full request/response control.

## Introduction

API Gateway Lambda proxy integration passes the entire HTTP request as a structured event to Lambda. For REST APIs and HTTP APIs using payload format `1.0`, Lambda returns a structured response with `statusCode`, `headers`, and `body`. For HTTP APIs using payload format `2.0`, API Gateway can infer a default `200` JSON response if Lambda does not return a `statusCode`. Proxy integration is the most common pattern-it gives Lambda full control over the response without requiring API Gateway mapping templates. This post covers both REST API (v1) and HTTP API (v2) Lambda integrations, including permission setup and URL path parameter mapping.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with API Gateway and Lambda permissions
- An existing Lambda function

## Step 1: REST API Lambda Proxy Integration

```hcl
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api"
  description = "REST API with Lambda proxy integration"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "{proxy+}"  # Catch-all path
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy.http_method
  integration_http_method = "POST"  # Lambda always invoked via POST
  type                    = "AWS_PROXY"
  uri                     = var.lambda_function_invoke_arn
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.lambda.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"
}
```

## Step 2: HTTP API (v2) Lambda Integration

```hcl
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://app.example.com"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_function_invoke_arn
  payload_format_version = "2.0"  # Use 2.0 for HTTP API format
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"  # Catch-all route
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "prod"
  auto_deploy = true

  access_log_settings {
    destination_arn = var.cloudwatch_log_group_arn
    format = jsonencode({
      requestId    = "$context.requestId"
      sourceIp     = "$context.identity.sourceIp"
      routeKey     = "$context.routeKey"
      status       = "$context.status"
      responseTime = "$context.responseLatency"
    })
  }
}

resource "aws_lambda_permission" "http_api" {
  statement_id  = "AllowHTTPAPIInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test the API

curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User"}'
```

## Conclusion

Use HTTP API (v2) with `payload_format_version = "2.0"` for new Lambda integrations-it has lower latency, lower cost, and a simpler event/response model than REST API. For REST API Lambda permissions that need to allow any proxy path, use `/*/*/*` in `source_arn` to allow invocations from any stage, method, and resource path; for tighter security, specify the exact stage, method, and resource path or route key. For REST API deployments, prefer a `triggers` hash over `depends_on` so configuration changes create a new deployment instead of only enforcing resource ordering.
