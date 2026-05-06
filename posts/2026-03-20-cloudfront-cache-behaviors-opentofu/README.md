# How to Configure CloudFront Cache Behaviors with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudFront, Caching, CDN, Infrastructure as Code

Description: Learn how to configure CloudFront cache behaviors, cache policies, and origin request policies for fine-grained caching control using OpenTofu.

## Introduction

CloudFront cache behaviors let you apply different caching rules to different URL paths. You can cache static assets for a year, bypass caching for API calls, and forward specific headers or query strings selectively. OpenTofu manages cache policies and behaviors as code.

## Cache Policy

Cache policies define what is included in the cache key.

```hcl
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.app_name}-static-assets"
  comment     = "Long-lived cache for static assets"
  default_ttl = 86400    # 1 day
  max_ttl     = 31536000 # 1 year
  min_ttl     = 0

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

    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

resource "aws_cloudfront_cache_policy" "api" {
  name        = "${var.app_name}-api"
  comment     = "No caching for API responses"
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
        items = ["Authorization", "Accept"]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }

    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}
```

## Origin Request Policy

Controls what is forwarded to the origin beyond the cache key.

```hcl
resource "aws_cloudfront_origin_request_policy" "api" {
  name    = "${var.app_name}-api-origin-policy"
  comment = "Forward all viewer headers, cookies, and query strings to the API"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "allViewer"  # forward all viewer headers
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}
```

## Distribution with Multiple Cache Behaviors

```hcl
resource "aws_cloudfront_distribution" "app" {
  enabled = true
  aliases = [var.app_domain]

  origin {
    domain_name = var.origin_domain_name
    origin_id   = "ALB"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Static assets – long cache TTL
  ordered_cache_behavior {
    path_pattern             = "/static/*"
    allowed_methods          = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "ALB"
    cache_policy_id          = aws_cloudfront_cache_policy.static_assets.id
    viewer_protocol_policy   = "redirect-to-https"
    compress                 = true
  }

  # Images under /images/ – long cache TTL
  ordered_cache_behavior {
    path_pattern             = "/images/*"
    allowed_methods          = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "ALB"
    cache_policy_id          = aws_cloudfront_cache_policy.static_assets.id
    viewer_protocol_policy   = "redirect-to-https"
    compress                 = true
  }

  # API calls – no caching
  ordered_cache_behavior {
    path_pattern               = "/api/*"
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "ALB"
    cache_policy_id            = aws_cloudfront_cache_policy.api.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.api.id
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
  }

  # Default – moderate caching
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB"
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # CachingOptimized managed policy
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

CloudFront cache behaviors allow precise control over what gets cached, for how long, and what gets forwarded to origins. OpenTofu manages cache policies, origin request policies, and ordered behaviors together - ensuring consistent, auditable CDN configuration.
