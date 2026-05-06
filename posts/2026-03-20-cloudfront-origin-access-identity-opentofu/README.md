# How to Set Up CloudFront Origin Access Identity with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudFront, OAI, S3 Security, Infrastructure as Code

Description: Learn how to set up CloudFront Origin Access Identity to restrict direct S3 bucket access and serve content exclusively through CloudFront using OpenTofu.

## Introduction

Origin Access Identity (OAI) is a legacy CloudFront feature, superseded by Origin Access Control (OAC), that creates a special CloudFront identity you grant S3 bucket access to. It ensures S3 objects can only be accessed through CloudFront, not directly. OpenTofu manages OAI creation and bucket policies.

> **Note:** AWS recommends Origin Access Control (OAC) for new distributions. OAI is legacy and does not support features such as newer S3 Regions, SSE-KMS, or dynamic `PUT`, `POST`, and `DELETE` requests to S3.

## Creating an OAI

```hcl
resource "aws_cloudfront_origin_access_identity" "website" {
  comment = "OAI for ${var.app_name} website bucket"
}
```

## S3 Bucket and Policy

```hcl
resource "aws_s3_bucket" "website" {
  bucket = "${var.app_name}-website-${var.account_id}"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

# Block all public access

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Allow only CloudFront OAI to read objects
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = {
        AWS = aws_cloudfront_origin_access_identity.website.iam_arn
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.website.arn}/*"
    }]
  })
}
```

## CloudFront Distribution Using OAI

```hcl
resource "aws_cloudfront_cache_policy" "website" {
  name        = "${var.app_name}-${var.environment}-website-cache-policy"
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
  price_class         = "PriceClass_100"

  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "S3-${var.app_name}"

    # Use OAI to authenticate with S3
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.website.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    cache_policy_id        = aws_cloudfront_cache_policy.website.id
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.app_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"  # SPA routing
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
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

output "oai_path" {
  value = aws_cloudfront_origin_access_identity.website.cloudfront_access_identity_path
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

CloudFront OAI restricts S3 bucket access to CloudFront only, preventing users from bypassing the CDN. OpenTofu manages the OAI, bucket policy, and distribution configuration together - ensuring your S3 content is only accessible through CloudFront's global edge network.
