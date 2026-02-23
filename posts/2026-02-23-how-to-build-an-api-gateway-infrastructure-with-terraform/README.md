# How to Build an API Gateway Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, API Gateway, AWS, Microservices, REST API

Description: A hands-on guide to building a production-ready API Gateway infrastructure with Terraform including custom domains, rate limiting, authentication, and monitoring.

---

Every modern application needs an API gateway. It is the front door to your backend services, handling authentication, rate limiting, request routing, and response transformation. Building this by hand through the AWS console is tedious and impossible to reproduce. Terraform lets you define your entire API gateway setup as code, making it easy to manage across environments and teams.

## Why Terraform for API Gateway?

API Gateway configurations are notoriously fiddly. Resources, methods, integrations, authorizers, stages, deployments - there are a lot of moving pieces. When you define them in Terraform, you get a clear picture of how everything fits together. Changes go through pull requests. Deployments are repeatable. And when you need to set up the same API in another environment, you just change the variables.

## Architecture Overview

We will build:

- AWS API Gateway (HTTP API and REST API options)
- Custom domain with TLS certificate
- Lambda authorizer for authentication
- Rate limiting and throttling
- Request/response logging
- CloudWatch monitoring and alarms
- WAF integration for security

## HTTP API with Lambda Backend

Let us start with an HTTP API, which is the newer, faster, and cheaper option for most use cases.

```hcl
# HTTP API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "main-api"
  protocol_type = "HTTP"
  description   = "Main application API"

  cors_configuration {
    allow_origins = ["https://app.company.com"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Request-ID"]
    max_age       = 3600
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Default stage with auto-deploy
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
      errorMessage   = "$context.error.message"
    })
  }

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }
}

# Lambda integration
resource "aws_apigatewayv2_integration" "users_service" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.users_service.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

# Routes
resource "aws_apigatewayv2_route" "get_users" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /users"
  target    = "integrations/${aws_apigatewayv2_integration.users_service.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "create_user" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /users"
  target    = "integrations/${aws_apigatewayv2_integration.users_service.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "get_user" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /users/{userId}"
  target    = "integrations/${aws_apigatewayv2_integration.users_service.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}
```

## JWT Authorizer

Use Cognito or any OIDC provider for authentication.

```hcl
# JWT authorizer using Cognito
resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-jwt"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.api.id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "api-users"

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  mfa_configuration = "ON"

  software_token_mfa_configuration {
    enabled = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "api" {
  name         = "api-client"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  access_token_validity  = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    refresh_token = "days"
  }
}
```

## Custom Domain and TLS

Set up a custom domain with automatic TLS.

```hcl
# ACM certificate
resource "aws_acm_certificate" "api" {
  domain_name       = "api.company.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Purpose = "api-gateway"
  }
}

# DNS validation
resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

# Custom domain name
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.company.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

# API mapping
resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}

# DNS record pointing to the API Gateway
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.company.com"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

## WAF Protection

Add a Web Application Firewall to protect your API from common attacks.

```hcl
# WAF Web ACL
resource "aws_wafv2_web_acl" "api" {
  name        = "api-waf"
  description = "WAF for API Gateway"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "api-rate-limit"
    }
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "aws-managed-common"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "aws-common-rules"
    }
  }

  # SQL Injection protection
  rule {
    name     = "sql-injection"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "sql-injection-rules"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "api-waf"
  }
}

# Associate WAF with API Gateway
resource "aws_wafv2_web_acl_association" "api" {
  resource_arn = aws_apigatewayv2_stage.default.arn
  web_acl_arn  = aws_wafv2_web_acl.api.arn
}
```

## Monitoring and Alarms

Track API health and performance with CloudWatch.

```hcl
# Log group for API Gateway access logs
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${aws_apigatewayv2_api.main.name}"
  retention_in_days = 30
}

# Alarm for high 5xx error rate
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API 5xx errors exceeded threshold"
  alarm_actions       = [aws_sns_topic.api_alerts.arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
  }
}

# Alarm for high latency
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "api-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 3000  # 3 seconds
  alarm_description   = "API p99 latency exceeded 3 seconds"
  alarm_actions       = [aws_sns_topic.api_alerts.arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
  }
}
```

## Wrapping Up

A well-built API Gateway infrastructure handles a lot more than routing requests. Authentication, rate limiting, WAF protection, custom domains, and monitoring all work together to give you a secure, observable, and performant API layer. Terraform makes it possible to manage all of these pieces in a single codebase, deploy them consistently, and evolve them through code reviews.

For end-to-end API monitoring with latency tracking, error rate dashboards, and uptime checks, take a look at [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-api-gateway-infrastructure-with-terraform/view) for complete API observability.
