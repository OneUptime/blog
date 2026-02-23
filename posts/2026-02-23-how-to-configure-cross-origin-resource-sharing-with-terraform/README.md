# How to Configure Cross-Origin Resource Sharing with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CORS, API Gateway, S3, CloudFront, AWS, Security

Description: Learn how to configure Cross-Origin Resource Sharing (CORS) policies with Terraform for API Gateway, S3, and CloudFront to enable secure cross-domain requests.

---

Cross-Origin Resource Sharing (CORS) is a browser security mechanism that controls which domains can make requests to your APIs and resources. When a web application hosted on one domain needs to access an API on a different domain, the browser enforces CORS policies. Without proper CORS configuration, these cross-origin requests will be blocked. Terraform allows you to configure CORS policies across multiple AWS services including API Gateway, S3, and CloudFront.

## Understanding CORS

CORS works through HTTP headers. When a browser makes a cross-origin request, it first sends a preflight OPTIONS request to check if the server allows the cross-origin access. The server responds with headers like `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`. If the response headers permit the request, the browser proceeds with the actual request.

Simple requests (GET, POST with certain content types) may not trigger a preflight, but most API calls with custom headers or JSON content types will.

## Prerequisites

You need Terraform 1.0 or later and an AWS account. The specific resources depend on whether you are configuring CORS for API Gateway, S3, or CloudFront.

## CORS on API Gateway HTTP API

API Gateway v2 (HTTP API) has built-in CORS support:

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# HTTP API with CORS configuration
resource "aws_apigatewayv2_api" "main" {
  name          = "cors-api"
  protocol_type = "HTTP"

  cors_configuration {
    # Allowed origins (use specific domains in production)
    allow_origins = [
      "https://app.example.com",
      "https://admin.example.com",
    ]

    # Allowed HTTP methods
    allow_methods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ]

    # Allowed request headers
    allow_headers = [
      "Content-Type",
      "Authorization",
      "X-Api-Key",
      "X-Request-Id",
    ]

    # Headers exposed to the browser
    expose_headers = [
      "X-Request-Id",
      "X-RateLimit-Remaining",
    ]

    # Allow credentials (cookies, authorization headers)
    allow_credentials = true

    # How long the browser can cache preflight results (seconds)
    max_age = 3600
  }

  tags = { Name = "cors-api" }
}

# Stage for the API
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}
```

## CORS on API Gateway REST API

For REST APIs (API Gateway v1), CORS requires more manual configuration:

```hcl
# REST API
resource "aws_api_gateway_rest_api" "main" {
  name = "cors-rest-api"
}

# Resource
resource "aws_api_gateway_resource" "items" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "items"
}

# OPTIONS method for CORS preflight
resource "aws_api_gateway_method" "options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.items.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Mock integration for OPTIONS (no backend needed)
resource "aws_api_gateway_integration" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.items.id
  http_method = aws_api_gateway_method.options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Method response for OPTIONS
resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.items.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Max-Age"       = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# Integration response for OPTIONS
resource "aws_api_gateway_integration_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.items.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'https://app.example.com'"
    "method.response.header.Access-Control-Max-Age"       = "'3600'"
  }
}
```

## CORS on S3 Buckets

Configure CORS for S3 buckets that serve static assets or receive uploads:

```hcl
# S3 bucket
resource "aws_s3_bucket" "assets" {
  bucket = "my-cors-assets"
}

# CORS configuration for the S3 bucket
resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  # Allow GET requests from the app domain
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://app.example.com"]
    expose_headers  = ["ETag", "Content-Length"]
    max_age_seconds = 3600
  }

  # Allow uploads from the app domain
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = ["https://app.example.com"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }

  # Allow font loading from any origin
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    expose_headers  = []
    max_age_seconds = 86400
  }
}
```

## CORS with CloudFront

Configure CloudFront to forward and cache CORS headers:

```hcl
# CloudFront distribution with CORS support
resource "aws_cloudfront_distribution" "main" {
  enabled = true

  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3Origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }

      # Forward Origin header so S3 can respond with CORS headers
      headers = [
        "Origin",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method",
      ]
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Add CORS headers via response headers policy
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Response headers policy for CORS
resource "aws_cloudfront_response_headers_policy" "cors" {
  name = "cors-policy"

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["Content-Type", "Authorization", "X-Api-Key"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["https://app.example.com", "https://admin.example.com"]
    }

    access_control_expose_headers {
      items = ["ETag", "X-Request-Id"]
    }

    access_control_max_age_sec = 3600
    origin_override            = true
  }
}
```

## Using Variables for CORS Configuration

Make your CORS configuration reusable:

```hcl
variable "allowed_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
  default = [
    "https://app.example.com",
    "https://admin.example.com",
  ]
}

variable "allowed_methods" {
  description = "List of allowed HTTP methods"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}

variable "allowed_headers" {
  description = "List of allowed request headers"
  type        = list(string)
  default     = ["Content-Type", "Authorization", "X-Api-Key"]
}

variable "max_age" {
  description = "Max age for preflight cache in seconds"
  type        = number
  default     = 3600
}
```

## Monitoring CORS Issues

CORS errors can be difficult to debug since they only appear in the browser console. Use [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-cross-origin-resource-sharing-with-terraform/view) to monitor your API endpoints and track CORS-related failures from different client origins.

## Best Practices

Never use `*` as the allowed origin in production when credentials are enabled. Be specific about allowed methods and headers. Set a reasonable `max_age` to reduce preflight requests. When using CloudFront, forward the `Origin` header to enable proper CORS responses from the origin. Test CORS from the actual client domains that will be making requests.

## Conclusion

CORS configuration with Terraform ensures your cross-origin policies are consistent, documented, and version-controlled. Whether you are configuring CORS on API Gateway, S3, or CloudFront, Terraform provides a declarative way to manage these security settings. By defining your CORS policies as code, you avoid manual misconfigurations and ensure that all environments have identical CORS settings.
