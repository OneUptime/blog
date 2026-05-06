# How to Create CloudFront Distributions with S3 Origins in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudFront, S3, CDN, Infrastructure as Code

Description: Learn how to create CloudFront distributions with S3 origins for static website hosting and asset delivery using OpenTofu.

## Introduction

Amazon CloudFront is a global CDN that caches content at edge locations worldwide. Pairing it with S3 as an origin provides fast, scalable static website hosting and asset delivery. OpenTofu manages the S3 bucket, bucket policy, and CloudFront distribution together.

## S3 Bucket

```hcl
resource "aws_s3_bucket" "website" {
  bucket = "${var.app_name}-website-${var.environment}-${var.account_id}"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## CloudFront Origin Access Control

```hcl
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${var.app_name}-oac"
  description                       = "OAC for ${var.app_name} website"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

## S3 Bucket Policy

```hcl
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.website.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
        }
      }
    }]
  })
}
```

## CloudFront Distribution

```hcl
resource "aws_cloudfront_cache_policy" "website" {
  name        = "${var.app_name}-website-cache-${var.environment}"
  comment     = "Cache policy for ${var.app_name} website"
  default_ttl = 3600
  max_ttl     = 86400
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"  # USA, Canada, Europe, and Israel

  aliases = var.custom_domain != "" ? [var.custom_domain] : []

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.website.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.id}"
    cache_policy_id  = aws_cloudfront_cache_policy.website.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Handle SPA routing - private S3 origins can return 403 or 404 for missing keys
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain == "" ? true : false

    acm_certificate_arn      = var.custom_domain != "" ? var.acm_certificate_arn : null
    ssl_support_method       = var.custom_domain != "" ? "sni-only" : null
    minimum_protocol_version = var.custom_domain != "" ? "TLSv1.2_2021" : null
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Outputs

```hcl
output "cloudfront_domain" {
  value = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_id" {
  value = aws_cloudfront_distribution.website.id
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

CloudFront with an S3 origin is the standard pattern for serving static websites and SPAs globally. OpenTofu manages the S3 bucket, Origin Access Control, bucket policy, cache policy, and CloudFront distribution - ensuring consistent, secure CDN deployments across environments.
