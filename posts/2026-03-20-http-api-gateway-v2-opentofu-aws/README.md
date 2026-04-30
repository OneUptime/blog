# How to Create an HTTP API Gateway v2 with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, HTTP API, Lambda, Terraform, Infrastructure as Code

Description: Learn how to create an AWS API Gateway v2 HTTP API with OpenTofu, including Lambda integrations, JWT authorization, CORS configuration, and custom domain names.

---

AWS API Gateway v2 HTTP API is a cost-effective, low-latency API gateway optimized for HTTP backends and Lambda functions. This guide covers creating and configuring a complete HTTP API with OpenTofu.

---

## Create the HTTP API

```hcl
# api_gateway.tf

resource "aws_apigatewayv2_api" "main" {
  name          = "my-http-api"
  protocol_type = "HTTP"
  description   = "Main HTTP API"

  cors_configuration {
    allow_headers = ["Content-Type", "Authorization"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins = ["https://app.example.com"]
    max_age       = 86400
  }

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}
```

---

## Lambda Integration

```hcl
# Lambda function
resource "aws_lambda_function" "api_handler" {
  function_name = "api-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = "lambda.zip"
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# Integration: API Gateway → Lambda
resource "aws_apigatewayv2_integration" "lambda" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.api_handler.invoke_arn
  payload_format_version = "2.0"
}
```

---

## Routes

```hcl
# Define routes
resource "aws_apigatewayv2_route" "get_users" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "post_users" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "get_user_by_id" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /users/{userId}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Catch-all route (optional)
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
```

---

## JWT Authorization

```hcl
resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "jwt-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.main.id]
    issuer   = "https://${aws_cognito_user_pool.main.endpoint}"
  }
}

# Apply JWT authorizer to protected routes
resource "aws_apigatewayv2_route" "protected" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /protected"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}
```

---

## Stage and Auto Deployment

```hcl
resource "aws_apigatewayv2_stage" "production" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "production"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      sourceIp       = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      protocol       = "$context.protocol"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
    })
  }

  default_route_settings {
    throttling_burst_limit   = 5000
    throttling_rate_limit    = 10000
    detailed_metrics_enabled = true
  }
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/apigateway/my-http-api"
  retention_in_days = 30
}
```

---

## Custom Domain Name

```hcl
resource "aws_apigatewayv2_domain_name" "main" {
  domain_name = "api.example.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.main.id
  stage       = aws_apigatewayv2_stage.production.id
}

# DNS record
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.main.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.main.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

---

## Outputs

```hcl
output "api_endpoint" {
  value = aws_apigatewayv2_api.main.api_endpoint
}

output "stage_url" {
  value = aws_apigatewayv2_stage.production.invoke_url
}

output "custom_domain_url" {
  value = "https://${aws_apigatewayv2_domain_name.main.domain_name}"
}
```

---

## Best Practices

1. **Use HTTP API over REST API** when you don't need REST-only features - it's cheaper and lower-latency
2. **Enable access logging** for all stages - critical for debugging production issues
3. **Set throttling limits** to protect your Lambda functions from traffic spikes
4. **Use payload format version 2.0** for Lambda integrations - cleaner request format
5. **Use CloudWatch metrics** for latency visibility on HTTP APIs

---

## Conclusion

AWS API Gateway v2 HTTP API with OpenTofu provides a serverless API layer with minimal operational overhead. Configure routes, Lambda integrations, JWT authorization, and custom domains as code for repeatable, versioned API deployments.

---

*Monitor your API endpoints with [OneUptime](https://oneuptime.com) - synthetic monitoring and uptime checks.*
