# How to Create CloudFront Distributions with ALB Origins in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudFront, ALB, CDN, Infrastructure as Code

Description: Learn how to create CloudFront distributions with Application Load Balancer origins for dynamic content caching and DDoS protection using OpenTofu.

## Introduction

Using CloudFront in front of an Application Load Balancer (ALB) provides global edge caching, DDoS protection via AWS Shield Standard, and SSL termination at the edge. OpenTofu manages the distribution, custom headers for origin validation, and cache behaviors.

## Custom Header for Origin Validation

Restrict the ALB so it only forwards requests that include a secret header added by CloudFront.

```hcl
resource "random_password" "cf_secret" {
  length  = 32
  special = false
}

# Add listener rules on the ALB to allow requests with the header
# and return 403 for everything else.

resource "aws_lb_listener_rule" "cf_only" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1

  condition {
    http_header {
      http_header_name = "X-CloudFront-Secret"
      values           = [random_password.cf_secret.result]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_lb_listener_rule" "deny_direct" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50000

  condition {
    path_pattern {
      values = ["/*"]
    }
  }

  action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Access denied"
      status_code  = "403"
    }
  }
}
```

## CloudFront Distribution with ALB Origin

```hcl
resource "aws_cloudfront_cache_policy" "dynamic" {
  name        = "${var.app_name}-dynamic"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Host", "Authorization", "Accept", "Accept-Language"]
      }
    }

    cookies_config {
      cookie_behavior = "all"
    }

    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

resource "aws_cloudfront_cache_policy" "static" {
  name        = "${var.app_name}-static"
  min_ttl     = 0
  default_ttl = 86400
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    headers_config {
      header_behavior = "none"
    }

    cookies_config {
      cookie_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_origin_request_policy" "static" {
  name = "${var.app_name}-static"

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Host"]
    }
  }

  cookies_config {
    cookie_behavior = "none"
  }

  query_strings_config {
    query_string_behavior = "none"
  }
}

resource "aws_cloudfront_distribution" "app" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_All"
  web_acl_id      = aws_wafv2_web_acl.cf.arn

  aliases = [var.app_domain]

  origin {
    domain_name = aws_lb.app.dns_name
    origin_id   = "ALB-${var.app_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    # Pass secret header to validate CloudFront origin
    custom_header {
      name  = "X-CloudFront-Secret"
      value = random_password.cf_secret.result
    }
  }

  # Default cache behavior – do not cache dynamic content
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${var.app_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.dynamic.id
  }

  # Cache static assets aggressively
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${var.app_name}"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id          = aws_cloudfront_cache_policy.static.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.static.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # CloudFront ACM certificates must be in us-east-1.
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## WAF Web ACL

```hcl
resource "aws_wafv2_web_acl" "cf" {
  provider = aws.us_east_1
  name     = "${var.app_name}-cloudfront"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.app_name}-cloudfront"
    sampled_requests_enabled   = true
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

CloudFront with an ALB origin provides edge caching, DDoS protection, and SSL termination for dynamic applications. OpenTofu manages the distribution, origin validation headers, modern cache and origin request policies for static and dynamic content, and WAF integration - creating a secure, globally distributed application delivery layer.
