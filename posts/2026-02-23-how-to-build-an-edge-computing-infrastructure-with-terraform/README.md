# How to Build an Edge Computing Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Edge Computing, CloudFront, Lambda@Edge, CDN

Description: Learn how to build edge computing infrastructure with Terraform using CloudFront Functions, Lambda@Edge, global acceleration, and edge-optimized API patterns.

---

Edge computing brings your code closer to your users. Instead of routing every request to a single region, you run logic at points of presence around the world. The result is lower latency, reduced bandwidth costs, and a better user experience. AWS provides several edge computing options, and Terraform lets you manage all of them in a single codebase.

## Why Edge Computing?

The speed of light is the ultimate performance bottleneck. A user in Sydney making a request to a server in Virginia will always experience latency. Edge computing reduces this by running logic at the nearest CloudFront edge location. For applications where every millisecond matters - real-time bidding, gaming, video streaming - edge computing is not a nice-to-have. It is a requirement.

## Architecture Overview

Our edge infrastructure includes:

- CloudFront Functions for lightweight transformations
- Lambda@Edge for complex edge logic
- Global Accelerator for non-HTTP workloads
- S3 with CloudFront for static content
- DynamoDB Global Tables for edge data
- Route53 latency-based routing

## CloudFront Functions

CloudFront Functions run at the edge with sub-millisecond startup times. They are perfect for lightweight transformations.

```hcl
# CloudFront function for URL rewriting
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "url-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite URLs for single page application routing"
  publish = true

  code = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // If the URI doesn't have a file extension, serve index.html
      if (!uri.includes('.')) {
        request.uri = '/index.html';
      }

      return request;
    }
  EOF
}

# CloudFront function for security headers
resource "aws_cloudfront_function" "security_headers" {
  name    = "security-headers"
  runtime = "cloudfront-js-2.0"
  comment = "Add security headers to all responses"
  publish = true

  code = <<-EOF
    function handler(event) {
      var response = event.response;
      var headers = response.headers;

      headers['strict-transport-security'] = {
        value: 'max-age=63072000; includeSubdomains; preload'
      };
      headers['x-content-type-options'] = { value: 'nosniff' };
      headers['x-frame-options'] = { value: 'DENY' };
      headers['x-xss-protection'] = { value: '1; mode=block' };
      headers['content-security-policy'] = {
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      };

      return response;
    }
  EOF
}

# CloudFront function for A/B testing
resource "aws_cloudfront_function" "ab_test" {
  name    = "ab-test-router"
  runtime = "cloudfront-js-2.0"
  comment = "Route users to A/B test variants"
  publish = true

  code = <<-EOF
    function handler(event) {
      var request = event.request;
      var cookies = request.cookies;

      // Check for existing variant cookie
      var variant = cookies['ab-variant'] ? cookies['ab-variant'].value : null;

      // Assign variant if not set
      if (!variant) {
        variant = Math.random() < 0.5 ? 'a' : 'b';
      }

      // Route to the appropriate origin path
      if (variant === 'b') {
        request.uri = '/variant-b' + request.uri;
      }

      // Pass variant info to origin
      request.headers['x-ab-variant'] = { value: variant };

      return request;
    }
  EOF
}
```

## Lambda@Edge for Complex Logic

Lambda@Edge handles logic that is too complex for CloudFront Functions.

```hcl
# Lambda@Edge function for authentication at the edge
resource "aws_lambda_function" "edge_auth" {
  # Lambda@Edge must be in us-east-1
  provider      = aws.us_east_1
  filename      = "edge_auth.zip"
  function_name = "edge-authentication"
  role          = aws_iam_role.lambda_edge.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 5
  memory_size   = 128
  publish       = true  # Lambda@Edge requires published versions

  tags = {
    Purpose = "edge-authentication"
  }
}

# Lambda@Edge for image optimization
resource "aws_lambda_function" "edge_image" {
  provider      = aws.us_east_1
  filename      = "edge_image.zip"
  function_name = "edge-image-optimizer"
  role          = aws_iam_role.lambda_edge.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 1024
  publish       = true

  tags = {
    Purpose = "image-optimization"
  }
}

# Lambda@Edge for geolocation-based routing
resource "aws_lambda_function" "edge_geo" {
  provider      = aws.us_east_1
  filename      = "edge_geo.zip"
  function_name = "edge-geo-router"
  role          = aws_iam_role.lambda_edge.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 5
  memory_size   = 128
  publish       = true
}

# IAM role for Lambda@Edge
resource "aws_iam_role" "lambda_edge" {
  provider = aws.us_east_1
  name     = "lambda-edge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = [
          "lambda.amazonaws.com",
          "edgelambda.amazonaws.com",
        ]
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_edge_basic" {
  provider   = aws.us_east_1
  role       = aws_iam_role.lambda_edge.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## CloudFront Distribution with Edge Functions

Tie everything together with a CloudFront distribution.

```hcl
# CloudFront distribution with edge computing
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Main application with edge computing"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"
  aliases             = ["app.company.com"]

  # Static content origin
  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "S3-static"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.static.cloudfront_access_identity_path
    }
  }

  # API origin
  origin {
    domain_name = "${aws_apigatewayv2_api.main.id}.execute-api.${var.region}.amazonaws.com"
    origin_id   = "API"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior - static content with edge functions
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-static"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # CloudFront Functions
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }

    function_association {
      event_type   = "viewer-response"
      function_arn = aws_cloudfront_function.security_headers.arn
    }

    # Lambda@Edge for authentication
    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.edge_auth.qualified_arn
      include_body = false
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # API behavior - pass through to backend
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "API"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Origin", "Accept"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # Image optimization behavior
  ordered_cache_behavior {
    path_pattern     = "/images/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-static"

    forwarded_values {
      query_string = true
      query_string_cache_keys = ["w", "h", "q"]  # width, height, quality
      cookies {
        forward = "none"
      }
    }

    lambda_function_association {
      event_type = "origin-request"
      lambda_arn = aws_lambda_function.edge_image.qualified_arn
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400
    default_ttl            = 604800
    max_ttl                = 31536000
    compress               = true
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

## Global Accelerator

For non-HTTP workloads or when you need static IP addresses, use Global Accelerator.

```hcl
# Global Accelerator for TCP/UDP workloads
resource "aws_globalaccelerator_accelerator" "main" {
  name            = "app-accelerator"
  ip_address_type = "IPV4"
  enabled         = true

  attributes {
    flow_logs_enabled   = true
    flow_logs_s3_bucket = aws_s3_bucket.accelerator_logs.id
    flow_logs_s3_prefix = "flow-logs/"
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_globalaccelerator_listener" "https" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.id
  protocol        = "TCP"

  port_range {
    from_port = 443
    to_port   = 443
  }
}

resource "aws_globalaccelerator_endpoint_group" "primary" {
  listener_arn                  = aws_globalaccelerator_listener.https.id
  endpoint_group_region         = "us-east-1"
  health_check_port             = 443
  health_check_protocol         = "TCP"
  health_check_interval_seconds = 10
  threshold_count               = 3

  endpoint_configuration {
    endpoint_id = aws_lb.app.arn
    weight      = 100
  }
}

resource "aws_globalaccelerator_endpoint_group" "secondary" {
  listener_arn                  = aws_globalaccelerator_listener.https.id
  endpoint_group_region         = "eu-west-1"
  health_check_port             = 443
  health_check_protocol         = "TCP"
  health_check_interval_seconds = 10
  threshold_count               = 3

  endpoint_configuration {
    endpoint_id = aws_lb.app_eu.arn
    weight      = 100
  }
}
```

## DynamoDB Global Tables for Edge Data

When edge functions need data access, use DynamoDB Global Tables for low-latency reads worldwide.

```hcl
# DynamoDB Global Table for edge-accessible data
resource "aws_dynamodb_table" "edge_config" {
  name         = "edge-configuration"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "configKey"

  attribute {
    name = "configKey"
    type = "S"
  }

  # Enable Global Tables
  replica {
    region_name = "us-east-1"
  }

  replica {
    region_name = "eu-west-1"
  }

  replica {
    region_name = "ap-southeast-1"
  }
}
```

## Wrapping Up

Edge computing infrastructure brings your application logic to the network edge, dramatically reducing latency for users worldwide. CloudFront Functions handle lightweight transformations at sub-millisecond speed. Lambda@Edge runs more complex logic. Global Accelerator optimizes routing for non-HTTP traffic. And DynamoDB Global Tables provide data access at the edge.

The key is to put the right logic in the right place. Simple header manipulation goes in CloudFront Functions. Authentication and image processing go in Lambda@Edge. And heavy business logic stays in your origin servers where you have full access to your data layer.

For monitoring your edge computing infrastructure across all regions and edge locations, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-edge-computing-infrastructure-with-terraform/view) for global edge observability.
