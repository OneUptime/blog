# How to Build a CDN Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDN, CloudFront, AWS, Performance, Infrastructure Patterns

Description: Build a production CDN infrastructure with Terraform using CloudFront distributions, custom caching policies, WAF integration, and origin failover for fast global content delivery.

---

A Content Delivery Network puts your content close to your users. Instead of every request traveling back to your origin server, cached copies are served from edge locations around the world. This dramatically reduces latency, lowers origin load, and improves reliability.

AWS CloudFront is a powerful CDN, but its configuration has a lot of knobs. Terraform lets you define your CDN setup as code, version it, and replicate it across environments. In this guide, we will build a production-ready CDN infrastructure covering multiple origins, custom caching policies, security headers, and WAF protection.

## CloudFront Distribution with Multiple Origins

Most real applications need multiple origins: an S3 bucket for static assets, an ALB for the API, and maybe another service for media files:

```hcl
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} CDN"
  default_root_object = "index.html"
  aliases             = [var.domain_name]
  price_class         = var.price_class
  web_acl_id          = aws_wafv2_web_acl.cdn.arn

  # Origin 1: S3 for static assets
  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "s3-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # Origin 2: ALB for API
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 60
    }

    custom_header {
      name  = "X-Custom-Header"
      value = var.origin_secret # Verify requests come from CloudFront
    }
  }

  # Origin 3: Media bucket
  origin {
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id                = "s3-media"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # Default behavior - static assets
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id            = aws_cloudfront_cache_policy.static_assets.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # API behavior - no caching, forward everything
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb-api"
    viewer_protocol_policy = "https-only"
    compress               = true

    cache_policy_id          = aws_cloudfront_cache_policy.api.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id
  }

  # Media behavior - long cache TTL
  ordered_cache_behavior {
    path_pattern           = "/media/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-media"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = aws_cloudfront_cache_policy.media.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

## Custom Cache Policies

Different content types need different caching strategies:

```hcl
# Static assets - long cache, immutable content with hash in filename
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.project_name}-static-assets"
  comment     = "Cache static assets aggressively"
  default_ttl = 86400     # 1 day
  max_ttl     = 31536000  # 1 year
  min_ttl     = 3600      # 1 hour

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# API calls - no caching
resource "aws_cloudfront_cache_policy" "api" {
  name        = "${var.project_name}-api"
  comment     = "No caching for API calls"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Authorization", "Accept", "Content-Type"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# Media files - very long cache
resource "aws_cloudfront_cache_policy" "media" {
  name        = "${var.project_name}-media"
  comment     = "Long cache for media files"
  default_ttl = 604800    # 7 days
  max_ttl     = 31536000  # 1 year
  min_ttl     = 86400     # 1 day

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Origin request policy for API - forward all headers
resource "aws_cloudfront_origin_request_policy" "api" {
  name    = "${var.project_name}-api-origin-request"
  comment = "Forward all necessary headers to API origin"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "allExcept"
    headers {
      items = ["Host"]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}
```

## Security Headers

Add security headers to all responses:

```hcl
resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.project_name}-security-headers"
  comment = "Security headers for all responses"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000 # 2 years
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      override                = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=()"
      override = true
    }
  }
}
```

## WAF Integration

Protect your CDN with AWS WAF:

```hcl
resource "aws_wafv2_web_acl" "cdn" {
  provider    = aws.us_east_1 # WAF for CloudFront must be in us-east-1
  name        = "${var.project_name}-cdn-waf"
  description = "WAF rules for CDN"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting
  rule {
    name     = "rate-limit"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - common exploits
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
      cloudwatch_metrics_enabled = true
      metric_name                = "aws-common-rules"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "cdn-waf"
    sampled_requests_enabled   = true
  }
}
```

## Origin Failover

Set up origin failover so if your primary origin goes down, CloudFront falls back to a secondary:

```hcl
resource "aws_cloudfront_distribution" "with_failover" {
  # Primary origin
  origin {
    domain_name = var.primary_alb_dns
    origin_id   = "primary-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Failover origin
  origin {
    domain_name = var.secondary_alb_dns
    origin_id   = "secondary-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Origin group for failover
  origin_group {
    origin_id = "api-failover-group"

    failover_criteria {
      status_codes = [500, 502, 503, 504]
    }

    member {
      origin_id = "primary-api"
    }

    member {
      origin_id = "secondary-api"
    }
  }

  # Use the origin group
  default_cache_behavior {
    target_origin_id       = "api-failover-group"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.static_assets.id
  }

  # ...rest of configuration
}
```

For monitoring your CDN performance and availability, see [building a monitoring and alerting stack with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

## Wrapping Up

A well-configured CDN is one of the highest-impact performance improvements you can make. The Terraform setup we built handles multiple origin types, custom caching policies per content type, security headers, WAF protection, and origin failover. Define it all in code, and every environment gets the same performance and security characteristics. CloudFront configuration can be overwhelming, but the modular approach with separate cache policies keeps things manageable.
