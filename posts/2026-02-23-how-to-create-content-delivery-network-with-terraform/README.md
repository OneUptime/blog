# How to Create Content Delivery Network with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDN, CloudFront, AWS, Performance, Caching, S3

Description: Learn how to create a complete Content Delivery Network setup with Terraform using AWS CloudFront, S3 origins, custom domains, and cache optimization.

---

A Content Delivery Network (CDN) caches and serves your content from edge locations around the world, reducing latency for users regardless of their geographic location. AWS CloudFront is a globally distributed CDN that integrates with S3, load balancers, and custom origins. Terraform allows you to define your entire CDN configuration as code, from origin settings and cache behaviors to custom domain names and SSL certificates.

## How CloudFront Works

CloudFront operates through a global network of edge locations. When a user requests content, CloudFront routes the request to the nearest edge location. If the content is cached there, it is served immediately. If not, CloudFront fetches it from the origin (S3, ALB, or custom server), caches it at the edge, and then serves it. Subsequent requests from nearby users are served from the cache, dramatically reducing latency and load on your origin.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and content to serve (an S3 bucket, a load balancer, or a custom origin server).

## Basic CloudFront with S3 Origin

Set up a CloudFront distribution with an S3 bucket as the origin:

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

# S3 bucket for static content
resource "aws_s3_bucket" "content" {
  bucket = "my-cdn-content-bucket"

  tags = { Name = "cdn-content" }
}

# Block public access to the S3 bucket (CloudFront will access it)
resource "aws_s3_bucket_public_access_block" "content" {
  bucket = aws_s3_bucket.content.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Origin Access Control for secure S3 access
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "s3-oac"
  description                       = "OAC for S3 origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "CDN for static content"
  price_class         = "PriceClass_All"

  # S3 Origin
  origin {
    domain_name              = aws_s3_bucket.content.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Use a managed cache policy
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id

    # TTL settings (used when origin does not set Cache-Control headers)
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Custom error responses
  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 404
    response_page_path = "/404.html"
  }

  # No geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Default CloudFront certificate
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Name = "main-cdn" }
}

# Managed cache policy
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "cloudfront" {
  bucket = aws_s3_bucket.content.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.content.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}
```

## Custom Domain and SSL Certificate

Add a custom domain name with an ACM certificate:

```hcl
# ACM certificate (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "cdn" {
  domain_name               = "cdn.example.com"
  subject_alternative_names = ["assets.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "cdn-certificate" }
}

# DNS validation records
data "aws_route53_zone" "main" {
  name = "example.com"
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cdn.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "cdn" {
  certificate_arn         = aws_acm_certificate.cdn.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront with custom domain
resource "aws_cloudfront_distribution" "custom_domain" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = ["cdn.example.com", "assets.example.com"]

  origin {
    domain_name              = aws_s3_bucket.content.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Custom SSL certificate
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cdn.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "custom-domain-cdn" }
}

# Route 53 alias record
resource "aws_route53_record" "cdn" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "cdn.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.custom_domain.domain_name
    zone_id                = aws_cloudfront_distribution.custom_domain.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Multiple Origins with Path-Based Routing

Serve different content from different origins:

```hcl
# CloudFront with multiple origins
resource "aws_cloudfront_distribution" "multi_origin" {
  enabled         = true
  is_ipv6_enabled = true

  # Static content from S3
  origin {
    domain_name              = aws_s3_bucket.content.bucket_regional_domain_name
    origin_id                = "S3Static"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # API from ALB
  origin {
    domain_name = aws_lb.api.dns_name
    origin_id   = "ALBApi"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior - static content
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Static"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  # API behavior - no caching, forward everything
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALBApi"
    viewer_protocol_policy = "https-only"

    # Disable caching for API calls
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  # Images - aggressive caching
  ordered_cache_behavior {
    path_pattern           = "/images/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Static"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Name = "multi-origin-cdn" }
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}
```

## Cache Invalidation

Set up a Lambda function to invalidate the cache when content changes:

```hcl
# Custom cache policy for fine-grained control
resource "aws_cloudfront_cache_policy" "custom" {
  name        = "custom-cache-policy"
  comment     = "Custom caching policy"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 1

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["version", "lang"]
      }
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}
```

## Outputs

```hcl
output "cdn_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cdn_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "cdn_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.main.arn
}
```

## Monitoring CDN Performance

Monitor your CDN performance and cache hit ratios with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-content-delivery-network-with-terraform/view) to ensure your content is being served efficiently from edge locations.

## Best Practices

Use Origin Access Control instead of Origin Access Identity for S3 origins. Enable compression for text-based content. Set appropriate TTL values based on how frequently your content changes. Use custom cache policies to control what is included in the cache key. Enable logging for troubleshooting and analytics. Use multiple origins with path-based routing to serve different content types optimally.

## Conclusion

Creating a CDN with Terraform gives you a version-controlled, reproducible content delivery setup. CloudFront's global network of edge locations combined with Terraform's declarative approach ensures your content is served fast and your configuration is consistent. Whether you are serving static assets, APIs, or a mix of both, Terraform makes it easy to manage complex CloudFront distributions.
