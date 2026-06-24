# How to Set Up Origin Shield with OpenTofu on CloudFront

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudFront, Origin Shield, CDN, Infrastructure as Code, Performance

Description: Learn how to enable CloudFront Origin Shield using OpenTofu to reduce load on your origin servers by adding an additional caching layer between edge locations and your origin.

---

CloudFront Origin Shield is an optional additional caching layer that sits between CloudFront's regional edge caches and your origin. It consolidates requests from all regional edge caches through a single point, dramatically reducing the number of requests that reach your origin. This is especially valuable for origins with limited capacity or high data transfer costs.

## How Origin Shield Works

```mermaid
graph LR
    A[Regional Edge Cache<br/>US-West] --> C[Origin Shield<br/>us-west-2]
    B[Regional Edge Cache<br/>US-East] --> C
    D[Regional Edge Cache<br/>EU] --> C
    C -->|Cache Miss Only| E[Your Origin]
```

Without Origin Shield, each regional edge cache makes its own request to the origin on cache misses. With Origin Shield, cache misses from all regional edge caches flow through Origin Shield first, and only one request reaches the origin per unique object.

## Enabling Origin Shield on a Distribution

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
  region = "us-east-1"  # CloudFront viewer certificates and CloudFront metrics are handled in us-east-1
}

resource "aws_cloudfront_distribution" "with_origin_shield" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]

  origin {
    domain_name = var.origin_domain_name
    origin_id   = "primary-origin"

    # Optional custom origin settings
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]

      # Increase timeouts to handle slow origin responses during Shield cache miss
      origin_read_timeout      = 60
      origin_keepalive_timeout = 60
    }

    # Enable Origin Shield - choose the region closest to your origin
    origin_shield {
      enabled              = true
      origin_shield_region = var.origin_shield_region  # e.g., "us-west-2"
    }
  }

  default_cache_behavior {
    target_origin_id       = "primary-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.site.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = var.common_tags
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_acm_certificate" "site" {
  domain   = var.domain_name
  statuses = ["ISSUED"]
}
```

## Choosing the Right Origin Shield Region

```hcl
# variables.tf
variable "origin_shield_region" {
  description = "Origin Shield region - pick the AWS region closest to your origin"
  type        = string

  # Valid values currently include: us-east-2, us-east-1, us-west-2,
  # ap-south-1, ap-northeast-2, ap-southeast-1, ap-southeast-2,
  # ap-northeast-1, eu-central-1, eu-west-1, eu-west-2,
  # sa-east-1, me-central-1
  default = "us-east-1"

  validation {
    condition = contains([
      "us-east-2", "us-east-1", "us-west-2",
      "ap-south-1", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2",
      "ap-northeast-1", "eu-central-1", "eu-west-1", "eu-west-2",
      "sa-east-1", "me-central-1"
    ], var.origin_shield_region)
    error_message = "Must be a valid Origin Shield region."
  }
}
```

## Monitoring Origin Shield Effectiveness

```hcl
# monitoring.tf
# Enable additional CloudFront metrics, then alert when cache hit rate drops significantly.
# For Origin Shield-specific hits, use CloudFront logs and look for OriginShieldHit.
resource "aws_cloudfront_monitoring_subscription" "with_origin_shield" {
  distribution_id = aws_cloudfront_distribution.with_origin_shield.id

  monitoring_subscription {
    realtime_metrics_subscription_config {
      realtime_metrics_subscription_status = "Enabled"
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "cache_hit_rate_low" {
  alarm_name          = "low-cloudfront-cache-hit-rate"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CacheHitRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = var.cache_hit_rate_threshold

  dimensions = {
    DistributionId = aws_cloudfront_distribution.with_origin_shield.id
    Region         = "Global"
  }

  alarm_description = "CloudFront cache hit rate dropped - review cache behavior and Origin Shield effectiveness"
  alarm_actions     = [var.alert_sns_topic_arn]
}
```

## Best Practices

- Choose the Origin Shield region closest to your origin, not to your users - the goal is to minimize origin-to-Shield latency.
- Origin Shield adds additional request charges when it acts as an incremental layer - calculate the break-even point based on your origin cost savings and current CloudFront pricing.
- Use CloudFront standard or real-time logs to see `OriginShieldHit`, and use the `CacheHitRate` metric for distribution-level trending.
- Use Origin Shield with high-traffic, slow-changing content (product images, documentation) for maximum benefit.
- Combine Origin Shield with a long TTL cache policy - Shield only helps when content is actually cached.
