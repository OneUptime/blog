# How to Create Custom Domain Names for API Gateway with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, API Gateway, Route53, ACM, Custom Domain, Infrastructure as Code

Description: Learn how to create custom domain names for AWS API Gateway with Terraform, including ACM certificate setup, Route53 DNS records, and base path mappings for production APIs.

---

Using custom domain names with API Gateway transforms your API URLs from cryptic auto-generated strings like `abc123.execute-api.us-east-1.amazonaws.com` into clean, branded endpoints like `api.example.com`. This guide walks through the complete setup of custom domain names for both REST and HTTP API Gateways using Terraform, including certificate management and DNS configuration.

## Why Custom Domain Names?

Custom domains provide several benefits. They give your APIs a professional appearance, allow you to maintain consistent URLs even if you recreate the API Gateway, enable you to use your own SSL certificates, and let you map multiple API stages or services under a single domain with different base paths.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, a registered domain name with a Route53 hosted zone, and basic understanding of API Gateway concepts.

## ACM Certificate for the Custom Domain

First, create an SSL/TLS certificate using AWS Certificate Manager. For API Gateway custom domains in us-east-1 (edge-optimized), the certificate must be in us-east-1. For regional endpoints, it must be in the same region as the API.

```hcl
provider "aws" {
  region = "us-east-1"
}

# Reference the existing Route53 hosted zone
data "aws_route53_zone" "main" {
  name         = "example.com"
  private_zone = false
}

# Create an ACM certificate for the API domain
resource "aws_acm_certificate" "api" {
  domain_name       = "api.example.com"
  validation_method = "DNS"

  # Also cover wildcard subdomains if needed
  subject_alternative_names = ["*.api.example.com"]

  lifecycle {
    create_before_destroy = true  # Prevent downtime during certificate renewal
  }

  tags = {
    Name = "api-certificate"
  }
}

# DNS validation records for the ACM certificate
resource "aws_route53_record" "cert_validation" {
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

  allow_overwrite = true
}

# Wait for the certificate to be validated
resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

## REST API Gateway with Custom Domain

Set up a REST API Gateway and map it to a custom domain name.

```hcl
# Create a REST API Gateway
resource "aws_api_gateway_rest_api" "main" {
  name        = "main-api"
  description = "Main application API"

  endpoint_configuration {
    types = ["REGIONAL"]  # Use REGIONAL for same-region certificate
  }
}

# Simple API resource and method for demonstration
resource "aws_api_gateway_resource" "health" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "health"
}

resource "aws_api_gateway_method" "health_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "GET"
  authorization = "NONE"
}

# Deploy the API
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  depends_on = [aws_api_gateway_method.health_get]

  lifecycle {
    create_before_destroy = true
  }
}

# API stage
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"

  tags = {
    Environment = "production"
  }
}

# Custom domain name for the API Gateway (Regional)
resource "aws_api_gateway_domain_name" "api" {
  domain_name              = "api.example.com"
  regional_certificate_arn = aws_acm_certificate_validation.api.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "api-custom-domain"
  }
}

# Map the custom domain to the API stage
resource "aws_api_gateway_base_path_mapping" "main" {
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  domain_name = aws_api_gateway_domain_name.api.domain_name
  base_path   = ""  # Empty string maps the root path
}

# DNS record pointing to the API Gateway custom domain
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.api.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api.regional_zone_id
    evaluate_target_health = true
  }
}
```

## Multiple API Services Under One Domain

Map different API services to different base paths under the same custom domain.

```hcl
# Users API
resource "aws_api_gateway_rest_api" "users" {
  name = "users-api"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Orders API
resource "aws_api_gateway_rest_api" "orders" {
  name = "orders-api"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Map users API to /users path
resource "aws_api_gateway_base_path_mapping" "users" {
  api_id      = aws_api_gateway_rest_api.users.id
  stage_name  = "prod"
  domain_name = aws_api_gateway_domain_name.api.domain_name
  base_path   = "users"  # api.example.com/users/*
}

# Map orders API to /orders path
resource "aws_api_gateway_base_path_mapping" "orders" {
  api_id      = aws_api_gateway_rest_api.orders.id
  stage_name  = "prod"
  domain_name = aws_api_gateway_domain_name.api.domain_name
  base_path   = "orders"  # api.example.com/orders/*
}
```

## HTTP API (API Gateway v2) with Custom Domain

HTTP APIs use a slightly different Terraform resource set.

```hcl
# Create an HTTP API (v2)
resource "aws_apigatewayv2_api" "http" {
  name          = "http-api"
  protocol_type = "HTTP"
  description   = "HTTP API with custom domain"
}

# Default stage with auto-deploy
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
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

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/http-api"
  retention_in_days = 14
}

# Custom domain for HTTP API (v2)
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.example.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"  # Enforce TLS 1.2 minimum
  }

  tags = {
    Name = "http-api-custom-domain"
  }
}

# Map the domain to the HTTP API stage
resource "aws_apigatewayv2_api_mapping" "main" {
  api_id      = aws_apigatewayv2_api.http.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}

# DNS record for the HTTP API custom domain
resource "aws_route53_record" "http_api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = true
  }
}
```

## Edge-Optimized Custom Domain

For globally distributed APIs, use an edge-optimized endpoint with a CloudFront distribution.

```hcl
# Edge-optimized custom domain (certificate must be in us-east-1)
resource "aws_api_gateway_domain_name" "edge" {
  domain_name     = "global-api.example.com"
  certificate_arn = aws_acm_certificate_validation.api.certificate_arn

  endpoint_configuration {
    types = ["EDGE"]
  }

  tags = {
    Name = "edge-api-custom-domain"
  }
}

# DNS record for edge-optimized endpoint (uses CloudFront domain)
resource "aws_route53_record" "edge_api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "global-api.example.com"
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.edge.cloudfront_domain_name
    zone_id                = aws_api_gateway_domain_name.edge.cloudfront_zone_id
    evaluate_target_health = true
  }
}
```

## Mutual TLS Custom Domain

For APIs requiring client certificate authentication.

```hcl
# S3 bucket for the truststore
resource "aws_s3_bucket" "truststore" {
  bucket = "api-truststore-bucket"
}

resource "aws_s3_object" "truststore" {
  bucket = aws_s3_bucket.truststore.id
  key    = "truststore.pem"
  source = "truststore.pem"  # Local file containing trusted CA certificates
}

# Custom domain with mutual TLS enabled
resource "aws_apigatewayv2_domain_name" "mtls" {
  domain_name = "secure-api.example.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  mutual_tls_authentication {
    truststore_uri = "s3://${aws_s3_bucket.truststore.id}/${aws_s3_object.truststore.key}"
  }
}
```

## Outputs

```hcl
output "api_custom_domain_url" {
  description = "Custom domain URL for the API"
  value       = "https://${aws_api_gateway_domain_name.api.domain_name}"
}

output "api_gateway_invoke_url" {
  description = "Default API Gateway invoke URL"
  value       = aws_api_gateway_stage.prod.invoke_url
}
```

## Testing the Custom Domain

After applying the configuration, wait for DNS propagation (typically a few minutes) and test with curl.

```bash
# Test the custom domain
curl https://api.example.com/health

# Compare with the default API Gateway URL
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/health
```

## Common Issues

Certificate validation can take several minutes. If it seems stuck, verify the DNS validation records were created correctly in Route53. For regional endpoints, make sure the certificate is in the same region as the API Gateway. For edge-optimized endpoints, the certificate must be in us-east-1.

Base path conflicts will cause errors. You cannot map two APIs to the same base path on the same custom domain. Plan your path structure carefully.

## Conclusion

Custom domain names transform API Gateway endpoints from generic AWS URLs into professional, branded API endpoints. With Terraform, you can automate the entire setup including certificate provisioning, DNS configuration, and base path mappings. Whether you use REST APIs or HTTP APIs, regional or edge-optimized endpoints, the pattern remains consistent.

For related topics, see our guide on [How to Configure TLS Mutual Authentication with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tls-mutual-authentication-with-terraform/view).
