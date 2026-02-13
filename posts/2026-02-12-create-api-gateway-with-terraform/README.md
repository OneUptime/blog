# How to Create API Gateway with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, API Gateway, Serverless

Description: Learn how to set up AWS API Gateway REST and HTTP APIs using Terraform, with Lambda integration, custom domains, and authorization.

---

API Gateway is the front door for your serverless applications on AWS. It handles routing, throttling, authentication, and more - all without you managing a single server. But configuring it through the console is tedious and error-prone. There are so many interconnected pieces that clicking through them manually just doesn't scale.

Terraform solves this by letting you define your entire API as code. In this post, we'll build both a REST API and an HTTP API with Terraform, covering Lambda integration, stages, custom domains, and authorization.

## REST API vs HTTP API

AWS offers two types of API Gateway: REST API (v1) and HTTP API (v2). Quick comparison:

- **REST API** has more features (request/response transformations, WAF integration, caching, API keys)
- **HTTP API** is cheaper, faster, and simpler. It supports JWT authorizers natively.
- For most new projects, HTTP API is the better choice unless you specifically need REST API features

We'll cover both, starting with REST API since it's more common in existing codebases.

## REST API with Lambda Integration

Let's build a simple REST API that proxies all requests to a Lambda function.

First, define the API and its root resource:

```hcl
# Create the REST API
resource "aws_api_gateway_rest_api" "my_api" {
  name        = "my-application-api"
  description = "API for my application"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Create a proxy resource that catches all paths
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.my_api.id
  parent_id   = aws_api_gateway_rest_api.my_api.root_resource_id
  path_part   = "{proxy+}"
}
```

Now wire up the HTTP method and Lambda integration:

```hcl
# Accept any HTTP method on the proxy resource
resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.my_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

# Integrate with Lambda using proxy integration
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = aws_api_gateway_rest_api.my_api.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api_handler.invoke_arn
}
```

Don't forget the root path - `{proxy+}` doesn't match `/` by itself:

```hcl
# Handle the root path separately
resource "aws_api_gateway_method" "root" {
  rest_api_id   = aws_api_gateway_rest_api.my_api.id
  resource_id   = aws_api_gateway_rest_api.my_api.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "root_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.my_api.id
  resource_id             = aws_api_gateway_rest_api.my_api.root_resource_id
  http_method             = aws_api_gateway_method.root.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api_handler.invoke_arn
}
```

## Deploying the API

REST APIs need explicit deployments and stages. Here's how to set that up:

```hcl
# Deploy the API
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.my_api.id

  # Redeploy when these resources change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.lambda.id,
      aws_api_gateway_method.root.id,
      aws_api_gateway_integration.root_lambda.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Create a stage
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.my_api.id
  stage_name    = "prod"

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
  }
}
```

The `triggers` block is crucial. Without it, Terraform won't know when to create a new deployment. The `create_before_destroy` lifecycle rule prevents downtime during redeployment.

## Lambda Permission

Lambda needs explicit permission to be invoked by API Gateway:

```hcl
# Allow API Gateway to invoke the Lambda function
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.my_api.execution_arn}/*/*"
}
```

## HTTP API (v2) - The Simpler Option

HTTP APIs are much less verbose. Here's the same thing using API Gateway v2:

```hcl
# Create the HTTP API
resource "aws_apigatewayv2_api" "http_api" {
  name          = "my-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://myapp.example.com"]
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }
}

# Lambda integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api_handler.invoke_arn
  payload_format_version = "2.0"
}

# Default route - catches everything
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Auto-deploy stage
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "prod"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
}
```

Notice how much simpler this is? No separate deployment resource, no root path workaround, and CORS is built right in.

## JWT Authorization

HTTP APIs have native JWT support, which is perfect for Cognito or any OIDC provider:

```hcl
# JWT authorizer for Cognito
resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.http_api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.api_client.id]
    issuer   = "https://${aws_cognito_user_pool.main.endpoint}"
  }
}

# Protected route
resource "aws_apigatewayv2_route" "protected" {
  api_id             = aws_apigatewayv2_api.http_api.id
  route_key          = "GET /api/protected"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}
```

For setting up Cognito user pools, see our post on [creating Cognito user pools with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-cognito-user-pools-with-terraform/view).

## Custom Domain Names

A custom domain makes your API look professional and lets you swap out backends without changing the URL.

This sets up a custom domain with an ACM certificate:

```hcl
# Custom domain for HTTP API
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.example.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api_cert.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

# Map the domain to the API stage
resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.http_api.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.prod.id
}

# DNS record pointing to the API Gateway domain
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

For managing SSL certificates, check out our guide on [managing ACM certificates with Terraform](https://oneuptime.com/blog/post/2026-02-12-manage-aws-acm-certificates-with-terraform/view).

## Throttling and Monitoring

Don't forget rate limiting and logging. Without them, a single client can overwhelm your backend:

```hcl
# Throttle settings for the stage
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.my_api.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"

  settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
    metrics_enabled        = true
    logging_level          = "INFO"
  }
}
```

## Wrapping Up

API Gateway with Terraform can feel verbose, especially the REST API variant. But once you have it working, you've got a repeatable, version-controlled API infrastructure. Use HTTP API for new projects unless you specifically need REST API features. And always set up proper logging and throttling before going to production.
