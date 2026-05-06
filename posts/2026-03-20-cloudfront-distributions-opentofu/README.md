# How to Create CloudFront Distributions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudFront, CDN, Infrastructure as Code, S3, Performance

Description: Learn how to create AWS CloudFront distributions using OpenTofu with S3 origins, custom cache behaviors, ACM certificates, and WAF integration for production web delivery.

---

CloudFront is AWS's global CDN that accelerates content delivery by caching responses at edge locations worldwide. With OpenTofu, you define your distribution configuration as code, making cache behavior changes, origin configuration, and security settings reviewable and auditable.

## Creating a CloudFront Distribution for S3 Static Site

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = "us-east-1"  # ACM certificates for CloudFront aliases must be in us-east-1
}

# S3 bucket for the static site
resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Origin Access Control (OAC) - modern replacement for OAI
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${var.bucket_name}-oac"
  description                       = "OAC for ${var.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Grant CloudFront access to the S3 bucket
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.site.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}

# ACM certificate (must be in us-east-1 for CloudFront)
data "aws_acm_certificate" "site" {
  domain   = var.domain_name
  statuses = ["ISSUED"]
}

# AWS-managed policies
data "aws_cloudfront_cache_policy" "managed_caching" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "managed_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

# The CloudFront distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"  # US, Canada, Europe, and Israel
  aliases             = [var.domain_name]

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  origin {
    domain_name = var.api_domain_name
    origin_id   = "APIOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id = data.aws_cloudfront_cache_policy.managed_caching.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }
  }

  # API cache behavior - no caching for API requests
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "APIOrigin"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id          = data.aws_cloudfront_cache_policy.managed_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.site.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"  # SPA routing
    error_caching_min_ttl = 10
  }
}
```

## CloudFront Function for SPA Routing

```hcl
# functions.tf
resource "aws_cloudfront_function" "spa_router" {
  name    = "spa-router"
  runtime = "cloudfront-js-2.0"
  comment = "Route SPA paths to index.html"
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
```

## Best Practices

- Use Origin Access Control (OAC) instead of the deprecated Origin Access Identity (OAI) for new distributions.
- Set `minimum_protocol_version = "TLSv1.2_2021"` to enforce modern TLS - older versions have known vulnerabilities.
- Use managed cache policies where they fit your workload, and review their TTL behavior against your origin cache headers.
- Enable `compress = true` to reduce bandwidth costs and improve load times for compressible content.
- Attach a WAF Web ACL to protect against common web attacks without changes to your origin.
