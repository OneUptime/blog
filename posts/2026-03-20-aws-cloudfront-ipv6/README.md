# How to Enable IPv6 on AWS CloudFront

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, CloudFront, CDN, Dualstack, Route 53

Description: Enable IPv6 on AWS CloudFront distributions, configure Route 53 AAAA alias records, and verify that clients can connect over IPv6 to your CDN-backed content.

## Introduction

AWS CloudFront supports IPv6 and can be enabled on existing or new distributions with a single setting. When IPv6 is enabled, CloudFront's edge locations respond to IPv6 client connections and serve content from cached or origin servers. The distribution supports both IPv4 and IPv6 viewer traffic, but Route 53 alias records do not automatically create AAAA records for custom domain names, so you should create both A and AAAA alias records when you enable IPv6.

## Enable IPv6 on CloudFront Distribution

```bash
DISTRIBUTION_ID="ABCDEFGHIJKLMNO"

# Get current distribution config
aws cloudfront get-distribution-config \
    --id "$DISTRIBUTION_ID" \
    --query "DistributionConfig" \
    --output json > /tmp/dist-config.json

# The ETag is needed for updates
ETAG=$(aws cloudfront get-distribution-config \
    --id "$DISTRIBUTION_ID" \
    --query "ETag" \
    --output text)

# Enable IPv6 (set IsIPV6Enabled to true)
# Edit /tmp/dist-config.json and set "IsIPV6Enabled": true

# Update distribution
aws cloudfront update-distribution \
    --id "$DISTRIBUTION_ID" \
    --if-match "$ETAG" \
    --distribution-config file:///tmp/dist-config.json
```

## Terraform CloudFront with IPv6

```hcl
# cloudfront_ipv6.tf

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true  # Enable IPv6
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "IPv6-enabled distribution"

  origin {
    domain_name = aws_s3_bucket.content.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.content.bucket}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.content.bucket}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
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

  tags = { Name = "ipv6-cdn" }
}

# Route 53 A alias record for CloudFront
resource "aws_route53_record" "cdn_a" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "cdn"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = "Z2FDTNDATAQYW2"  # CloudFront hosted zone ID (constant)
    evaluate_target_health = false
  }
}

# Route 53 AAAA alias record for CloudFront
resource "aws_route53_record" "cdn_aaaa" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "cdn"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = "Z2FDTNDATAQYW2"  # Same constant zone ID
    evaluate_target_health = false
  }
}
```

## Verify IPv6 CloudFront Configuration

```bash
# Check if distribution has IPv6 enabled
aws cloudfront get-distribution \
    --id "$DISTRIBUTION_ID" \
    --query "Distribution.DistributionConfig.IsIPV6Enabled"

# Check AAAA records for the CloudFront domain
DIST_DOMAIN="abcdefghij.cloudfront.net"
dig AAAA "$DIST_DOMAIN"

# Test IPv6 access
curl -6 -I "https://cdn.example.com/"
curl -6 "https://cdn.example.com/test.txt"

# Check response headers (CloudFront adds headers such as X-Cache and Via)
curl -6 -s -D- "https://cdn.example.com/" -o /dev/null | \
    grep -E "X-Cache|Via|Server"

# Test from IPv6 perspective
curl -w "Remote IP: %{remote_ip}\n" -6 -s -o /dev/null "https://cdn.example.com/"
```

## WAF with IPv6 on CloudFront

```hcl
# WAF ACL with IPv6 rule
resource "aws_wafv2_web_acl" "main" {
  name  = "main-waf"
  scope = "CLOUDFRONT"  # Must be in us-east-1 for CloudFront

  # Block specific IPv6 ranges
  rule {
    name     = "BlockIPv6Range"
    priority = 1

    action {
      block {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.blocked_ipv6.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockedIPv6"
      sampled_requests_enabled   = true
    }
  }

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WAFRules"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_ip_set" "blocked_ipv6" {
  name               = "blocked-ipv6-ranges"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV6"

  addresses = [
    "2001:db8:bad::/48",  # Example blocked range
  ]
}
```

## Conclusion

Enabling IPv6 on CloudFront is a single flag (`is_ipv6_enabled = true`) in Terraform or the console. After enabling, the distribution can serve IPv6 viewer requests from CloudFront edge locations globally. If you're using Route 53 alias records with alternate domain names, create both A and AAAA ALIAS records pointing to the CloudFront domain to support IPv4 and IPv6 clients. The CloudFront zone ID for aliases is `Z2FDTNDATAQYW2`. WAF rules work equally for IPv4 and IPv6 traffic, and IP sets support both address families.
