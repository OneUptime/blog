# How to Implement Terraform for Global CDN Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDN, CloudFront, Content Delivery, Performance

Description: Learn how to implement global CDN infrastructure with Terraform, including CloudFront distributions, origin configurations, cache policies, WAF integration, and performance optimization.

---

A global Content Delivery Network (CDN) is essential for serving content to users worldwide with low latency. Terraform manages CDN infrastructure by defining distributions, origins, cache behaviors, security rules, and monitoring as code. This ensures your CDN configuration is consistent, versioned, and reviewable.

In this guide, we will cover how to build a production-ready global CDN with Terraform.

## CloudFront Distribution Configuration

```hcl
# cdn/cloudfront.tf
# Production CloudFront distribution

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"
  aliases             = [var.domain_name, "www.${var.domain_name}"]
  web_acl_id          = aws_wafv2_web_acl.cdn.arn

  # Application origin
  origin {
    domain_name = var.origin_domain
    origin_id   = "app-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 30
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = var.origin_secret
    }
  }

  # Static assets origin (S3)
  origin {
    domain_name              = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id                = "static-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # Default behavior - application
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "app-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = aws_cloudfront_cache_policy.dynamic.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.app.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  # Static assets behavior
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "static-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = aws_cloudfront_cache_policy.static.id

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # API behavior - no caching
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "app-origin"
    viewer_protocol_policy = "redirect-to-https"

    cache_policy_id          = aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 503
    response_code         = 503
    response_page_path    = "/maintenance.html"
    error_caching_min_ttl = 10
  }

  tags = var.common_tags
}
```

## Cache Policy Configuration

```hcl
# cdn/cache-policies.tf
# Optimized cache policies for different content types

resource "aws_cloudfront_cache_policy" "static" {
  name        = "static-content-${var.environment}"
  default_ttl = 86400     # 1 day
  max_ttl     = 31536000  # 1 year
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

resource "aws_cloudfront_cache_policy" "dynamic" {
  name        = "dynamic-content-${var.environment}"
  default_ttl = 0
  max_ttl     = 60
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Authorization", "Accept-Language"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}
```

## WAF Integration

```hcl
# cdn/waf.tf
# WAF rules for CDN protection

resource "aws_wafv2_web_acl" "cdn" {
  provider = aws.us_east_1  # WAF for CloudFront must be in us-east-1

  name  = "cdn-waf-${var.environment}"
  scope = "CLOUDFRONT"

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
        limit              = 10000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # AWS managed rules
  rule {
    name     = "aws-common-rules"
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

## CDN Monitoring

```hcl
# cdn/monitoring.tf
# CDN performance monitoring

resource "aws_cloudwatch_metric_alarm" "cache_hit_rate" {
  alarm_name          = "cdn-cache-hit-rate-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CacheHitRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 80  # Alert if cache hit rate drops below 80%

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
    Region         = "Global"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "cdn-5xx-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
    Region         = "Global"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Best Practices

Use different cache policies for different content types. Static assets should be cached aggressively while API responses should not be cached at all.

Implement WAF rules to protect against common attacks. Rate limiting, SQL injection protection, and bot management should be enabled.

Monitor cache hit rates. A low cache hit rate means your CDN is not serving its purpose and users are hitting origin servers directly.

Use origin access control for S3 origins. This prevents users from bypassing CloudFront and accessing S3 directly.

Enable Brotli and gzip compression. Compressed content reduces bandwidth costs and improves page load times.

## Conclusion

Global CDN infrastructure with Terraform provides fast, secure content delivery to users worldwide. By managing CloudFront distributions, cache policies, WAF rules, and monitoring as code, you create a CDN configuration that is consistent, versioned, and reviewable. The combination of proper caching strategies, security rules, and performance monitoring ensures your CDN delivers the best possible user experience.
