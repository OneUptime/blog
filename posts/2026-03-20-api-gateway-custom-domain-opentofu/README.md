# How to Configure API Gateway Custom Domains with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Custom Domain, ACM, Route 53, Infrastructure as Code

Description: Learn how to configure custom domains for API Gateway with OpenTofu using ACM certificates, base path mappings, and Route 53 DNS records.

## Introduction

API Gateway custom domains replace auto-generated endpoints like `abc123.execute-api.us-east-1.amazonaws.com` with branded URLs like `api.yourcompany.com`. Custom domains support multiple APIs under different base paths on the same domain and enable seamless API versioning without changing client URLs.

## Prerequisites

- OpenTofu v1.6+
- A Route 53 hosted zone for your domain
- AWS credentials with API Gateway, ACM, and Route 53 permissions

## Step 1: Create ACM Certificate

```hcl
# ACM certificate for the custom domain

# For REGIONAL endpoints, certificate must be in the same region
# For EDGE (CloudFront) endpoints, certificate must be in us-east-1
resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "api.${var.domain_name}"
  }
}

# DNS validation records
resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}
```

## Step 2: Create Custom Domain Name

```hcl
resource "aws_api_gateway_domain_name" "main" {
  domain_name              = "api.${var.domain_name}"
  regional_certificate_arn = aws_acm_certificate_validation.api.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  security_policy = "TLS_1_2"  # Enforce TLS 1.2 minimum

  tags = {
    Name = "api.${var.domain_name}"
  }
}
```

## Step 3: Create Base Path Mappings

```hcl
# Map /v1 path to the v1 API stage
resource "aws_api_gateway_base_path_mapping" "v1" {
  api_id      = var.api_v1_id
  stage_name  = "prod"
  domain_name = aws_api_gateway_domain_name.main.domain_name
  base_path   = "v1"
}

# Map /v2 path to the v2 API stage
resource "aws_api_gateway_base_path_mapping" "v2" {
  api_id      = var.api_v2_id
  stage_name  = "prod"
  domain_name = aws_api_gateway_domain_name.main.domain_name
  base_path   = "v2"
}

# Default mapping (empty base path) for current active version
resource "aws_api_gateway_base_path_mapping" "default" {
  api_id      = var.api_v2_id
  stage_name  = "prod"
  domain_name = aws_api_gateway_domain_name.main.domain_name
  # No base_path = empty string = root mapping
}
```

## Step 4: Create Route 53 DNS Record

```hcl
resource "aws_route53_record" "api" {
  zone_id = var.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.main.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.main.regional_zone_id
    evaluate_target_health = false
  }
}
```

## Step 5: HTTP API Custom Domain

```hcl
# For HTTP API (v2), use apigatewayv2 resources instead of the REST API resources above
resource "aws_apigatewayv2_domain_name" "http_api" {
  domain_name = "api.${var.domain_name}"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "http_api" {
  api_id          = var.http_api_id
  domain_name     = aws_apigatewayv2_domain_name.http_api.id
  stage           = "prod"
  api_mapping_key = "v2"  # Results in api.example.com/v2
}

resource "aws_route53_record" "api_http" {
  zone_id = var.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.http_api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.http_api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test the custom domain
curl https://api.example.com/v1/users
curl https://api.example.com/v2/users
```

## Conclusion

Custom domains decouple your API clients from the internal API Gateway endpoint structure, allowing API upgrades, migrations, and versioning without client changes. Use base path mappings to run multiple API versions side-by-side under the same domain-clients can migrate from `/v1` to `/v2` on their own schedule. Always enforce TLS 1.2 via the security policy to meet modern security standards.
