# How to Create Lambda with API Gateway Integration in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, API Gateway, Serverless, REST API

Description: A practical guide to connecting AWS Lambda functions to API Gateway using Terraform, covering both REST API and HTTP API configurations with routes, stages, and CORS.

---

Lambda functions do not expose HTTP endpoints on their own. To make them accessible over the web, you need API Gateway in front of them. API Gateway handles the HTTP routing, request validation, throttling, and authentication, while Lambda handles the business logic. Together they form the backbone of serverless APIs on AWS.

Terraform lets you define the entire stack - the Lambda function, the API Gateway, and the wiring between them - in one configuration. This guide covers both the REST API (v1) and HTTP API (v2) flavors of API Gateway, because they have different trade-offs.

## HTTP API (API Gateway V2) - The Simple Path

If you are starting fresh, the HTTP API is usually the right choice. It is cheaper, faster, and simpler to configure:

```hcl
# The Lambda function
resource "aws_lambda_function" "api" {
  function_name = "myapp-api"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_exec.arn

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = {
    Name = "myapp-api"
  }
}

# Package the Lambda code
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/lambda.zip"
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "myapp-api-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# HTTP API (API Gateway v2)
resource "aws_apigatewayv2_api" "main" {
  name          = "myapp-api"
  protocol_type = "HTTP"
  description   = "HTTP API for myapp"

  # CORS configuration
  cors_configuration {
    allow_headers = ["Content-Type", "Authorization"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins = ["https://myapp.com"]
    max_age       = 300
  }

  tags = {
    Name = "myapp-api"
  }
}

# Lambda integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id = aws_apigatewayv2_api.main.id

  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.api.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

# Catch-all route - send everything to Lambda
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Deploy a stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integrationLatency"
    })
  }

  tags = {
    Name = "default-stage"
  }
}

# CloudWatch log group for API access logs
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/myapp-api"
  retention_in_days = 30
}

# Permission for API Gateway to invoke Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

## Specific Routes Instead of Catch-All

For more control, define individual routes:

```hcl
# Route for GET /users
resource "aws_apigatewayv2_route" "get_users" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Route for POST /users
resource "aws_apigatewayv2_route" "create_user" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Route for GET /users/{id}
resource "aws_apigatewayv2_route" "get_user" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /users/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Route for PUT /users/{id}
resource "aws_apigatewayv2_route" "update_user" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /users/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
```

## REST API (API Gateway V1) - When You Need More Features

The REST API offers more features: request/response transformation, API keys, usage plans, and WAF integration. It is more verbose but more powerful:

```hcl
# REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "myapp-rest-api"
  description = "REST API for myapp"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "myapp-rest-api"
  }
}

# /users resource
resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "users"
}

# GET /users method
resource "aws_api_gateway_method" "get_users" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "GET"
  authorization = "NONE"
}

# Lambda integration for GET /users
resource "aws_api_gateway_integration" "get_users" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.get_users.http_method

  integration_http_method = "POST"  # Lambda always uses POST
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

# Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  # Redeploy when these resources change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.users.id,
      aws_api_gateway_method.get_users.id,
      aws_api_gateway_integration.get_users.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Stage
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId  = "$context.requestId"
      ip         = "$context.identity.sourceIp"
      httpMethod = "$context.httpMethod"
      status     = "$context.status"
    })
  }

  tags = {
    Name = "prod"
  }
}

# Permission for REST API to invoke Lambda
resource "aws_lambda_permission" "rest_api" {
  statement_id  = "AllowRESTAPIInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
```

## Custom Domain Name

Point your own domain at the API:

```hcl
# ACM certificate (must be in us-east-1 for edge-optimized, or same region for regional)
resource "aws_acm_certificate" "api" {
  domain_name       = "api.myapp.com"
  validation_method = "DNS"
}

# Custom domain for HTTP API
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.myapp.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

# Map the custom domain to the API stage
resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}

# Route53 record
resource "aws_route53_record" "api" {
  zone_id = var.route53_zone_id
  name    = "api.myapp.com"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Outputs

```hcl
output "api_url" {
  description = "API Gateway URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "custom_domain_url" {
  description = "Custom domain URL"
  value       = "https://${aws_apigatewayv2_domain_name.api.domain_name}"
}

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}
```

## Summary

Connecting Lambda to API Gateway in Terraform requires the API resource, an integration, routes (or methods and resources for REST API), a stage, and a Lambda permission. The HTTP API (v2) is simpler and cheaper for most use cases. The REST API (v1) adds features like request transformation and API keys. Use the `$default` route for catch-all routing to a framework like Express or FastAPI that handles routing internally, or define specific routes for fine-grained control at the API Gateway level.
