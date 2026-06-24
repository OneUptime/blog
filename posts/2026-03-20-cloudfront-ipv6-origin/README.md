# How to Configure AWS CloudFront with IPv6 Origin Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudFront, AWS, IPv6, CDN, Origin, Cloud

Description: A guide to configuring AWS CloudFront to accept IPv6 requests from clients and connect to IPv6-capable origins, enabling end-to-end IPv6 content delivery.

AWS CloudFront supports IPv6 in two ways: accepting connections from IPv6 clients (viewer-facing) and, for custom origins except Amazon S3 and VPC origins, connecting to origins over IPv6 (origin-facing). This guide covers both configurations.

## CloudFront IPv6 for Viewers (Client-Facing)

When you enable IPv6 on a CloudFront distribution, its DNS name returns a AAAA record and accepts connections from IPv6 clients:

### Terraform

```hcl
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true    # Enable IPv6 client support
  comment             = "Main distribution with IPv6"
  price_class         = "PriceClass_100"

  origin {
    domain_name = aws_s3_bucket.main.bucket_regional_domain_name
    origin_id   = "S3Origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

### AWS CLI

```bash
# Enable IPv6 on existing distribution

aws cloudfront update-distribution \
  --id EXAMPLEID \
  --if-match "ETAG" \
  --distribution-config file://dist-config.json

# In dist-config.json:
# "IsIPV6Enabled": true
```

## Verifying CloudFront IPv6 for Viewers

```bash
# Check distribution has AAAA record after enabling IPv6
dig AAAA your-distribution.cloudfront.net

# Test IPv6 client connection
curl -6 https://your-distribution.cloudfront.net/

# Verify IPv6 address in response
curl -6 -v https://your-distribution.cloudfront.net/ 2>&1 | grep "Connected to"
```

## CloudFront to IPv6 Origins

Origin-facing IPv6 applies to custom origins, excluding Amazon S3 and VPC origins.

For CloudFront to connect to a custom origin using IPv6, the origin must:
1. Resolve to an IPv6 address (AAAA record)
2. Accept connections over IPv6

```hcl
resource "aws_cloudfront_distribution" "ipv6_origin" {
  enabled         = true
  is_ipv6_enabled = true

  origin {
    # Use a hostname that resolves to an AAAA record
    domain_name = "origin.example.com"
    origin_id   = "CustomOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      ip_address_type        = "ipv6"
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "CustomOrigin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

## Real Client IPv6 in CloudFront

CloudFront always adds or appends the viewer IP to `X-Forwarded-For`. If you include `CloudFront-Viewer-Address` in an origin request policy, your origin also receives the viewer IP and source port:

```bash
# At your origin:
# X-Forwarded-For: 2001:db8::1
# CloudFront-Viewer-Address: viewer IP + source port (when included by an origin request policy)

# If your custom origin is IPv6-only, trust CloudFront's current origin-facing IPv6 ranges
real_ip_header X-Forwarded-For;
set_real_ip_from 2600:9000:1000::/36;
set_real_ip_from 2600:9000:5200::/40;
```

## Route 53 Alias Records for IPv6 CloudFront

```hcl
resource "aws_route53_record" "cdn_ipv6" {
  zone_id = aws_route53_zone.main.id
  name    = "cdn.example.com"
  type    = "AAAA"    # AAAA record for IPv6

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cdn_ipv4" {
  zone_id = aws_route53_zone.main.id
  name    = "cdn.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
```

Enabling CloudFront IPv6 with `is_ipv6_enabled = true` is a single configuration change that enables IPv6 viewer connections after the distribution deploys, making it one of the easiest ways to add IPv6 support to AWS-hosted content.
