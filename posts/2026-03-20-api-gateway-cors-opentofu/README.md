# How to Configure API Gateway CORS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, CORS, Cross-Origin, Web API, Infrastructure as Code

Description: Learn how to configure CORS (Cross-Origin Resource Sharing) on API Gateway with OpenTofu for both REST API and HTTP API to allow browser-based applications to make cross-origin requests.

## Introduction

CORS allows browsers to make requests to APIs hosted on different domains. For API Gateway, CORS requires handling the preflight OPTIONS request (returning appropriate headers) and including CORS headers in actual responses. HTTP API (v2) has built-in CORS configuration that handles OPTIONS automatically in most cases, though APIs with an authorized `$default` route still need an unauthenticated `OPTIONS /{proxy+}` route. REST API (v1) requires manual OPTIONS method setup with mock integration or Lambda handling. Misconfigured CORS is one of the most common issues when building browser-based applications.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with API Gateway permissions
- A deployed API Gateway stage

## Step 1: HTTP API (v2) Built-in CORS

```hcl
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["Content-Type", "Authorization", "X-Api-Key", "X-Requested-With"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    allow_origins     = var.cors_allowed_origins  # e.g., ["https://app.example.com"]
    expose_headers    = ["X-Request-Id"]
    max_age           = 300  # Cache preflight response for 5 minutes
  }
}
```

## Step 2: REST API CORS with Mock Integration (OPTIONS)

```hcl
# CORS OPTIONS method on a resource

resource "aws_api_gateway_method" "options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id          = aws_api_gateway_rest_api.main.id
  resource_id          = aws_api_gateway_resource.resource.id
  http_method          = aws_api_gateway_method.options.http_method
  type                 = "MOCK"  # No backend needed for preflight
  passthrough_behavior = "NEVER"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Max-Age"       = true
  }
}

resource "aws_api_gateway_integration_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code

  depends_on = [aws_api_gateway_integration.options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'https://app.example.com'"
    "method.response.header.Access-Control-Max-Age"       = "'300'"
  }
}
```

This config handles the preflight request only; your REST API's actual method responses must also return `Access-Control-Allow-Origin`, or your backend must return it when you use a proxy integration.

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test CORS preflight
curl -X OPTIONS https://<api-id>.execute-api.<region>.amazonaws.com/prod/resource \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# Should return 200 with Access-Control-* headers
```

## Conclusion

Use HTTP API (v2) with built-in `cors_configuration` whenever possible-it handles OPTIONS preflight automatically in most cases and is far simpler than manually configuring OPTIONS methods for each REST API resource. Never use `allow_origins = ["*"]` in production with `allow_credentials = true`-this combination is rejected by browsers. For REST API non-proxy integrations, ensure CORS headers are included in both the method response (declaring they exist) and the integration response (setting their values), and make sure actual method responses return `Access-Control-Allow-Origin`; forgetting any of these causes CORS failures.
