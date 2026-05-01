# How to Deploy a React Static Site with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, React, S3, CloudFront, Static Site, Infrastructure as Code

Description: Learn how to deploy a React application as a static site on AWS using OpenTofu, with S3 for storage and CloudFront for global content delivery.

## Introduction

React applications compiled with `npm run build` produce static files that can be served from S3 + CloudFront at very low cost. This guide deploys a React static site with S3, CloudFront, ACM certificate, and proper cache configurations. This example assumes the production build outputs `index.html` at the root of `build/` and content-hashed assets under `build/static/`.

## S3 Bucket for Static Files

```hcl
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "react_app" {
  bucket = "myapp-react-${var.environment}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "react_app" {
  bucket = aws_s3_bucket.react_app.id

  # Block all public access - CloudFront accesses via OAC
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "react_app" {
  bucket = aws_s3_bucket.react_app.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## CloudFront Origin Access Control

```hcl
resource "aws_cloudfront_origin_access_control" "react_app" {
  name                              = "myapp-react-oac"
  description                       = "OAC for React app S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Bucket policy allowing CloudFront OAC access

data "aws_iam_policy_document" "react_app_bucket" {
  statement {
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.react_app.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.react_app.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "react_app" {
  bucket = aws_s3_bucket.react_app.id
  policy = data.aws_iam_policy_document.react_app_bucket.json
}
```

## ACM Certificate

```hcl
provider "aws" {
  region = var.aws_region
}

# Certificate must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "react_app" {
  provider          = aws.us-east-1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = ["www.${var.domain_name}"]

  lifecycle {
    create_before_destroy = true
  }
}
```

After requesting the certificate, create the ACM DNS validation CNAME records in your DNS provider and wait for the certificate status to become `Issued` before creating or updating the CloudFront distribution.

## CloudFront Distribution

```hcl
resource "aws_cloudfront_distribution" "react_app" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name, "www.${var.domain_name}"]
  price_class         = "PriceClass_100"  # US, Canada, Europe, and Israel

  origin {
    domain_name              = aws_s3_bucket.react_app.bucket_regional_domain_name
    origin_id                = "S3-react-app"
    origin_access_control_id = aws_cloudfront_origin_access_control.react_app.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-react-app"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # Managed-CachingOptimized
  }

  # Cache-busted assets (JS, CSS with hashed filenames)
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-react-app"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # Managed-CachingOptimized
  }

  # SPA routing: return index.html for 404s
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.react_app.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }
}

output "s3_bucket_name" {
  value = aws_s3_bucket.react_app.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.react_app.id
}
```

Point your apex and `www` DNS records at the CloudFront distribution after it is deployed.

## Deploying React Build Files

```bash
# Build the React app
npm run build

# Upload hashed static assets with a 1-year cache policy
aws s3 sync build/static/ s3://$(tofu output -raw s3_bucket_name)/static/ \
  --cache-control "public, max-age=31536000, immutable"

# Upload non-hashed files with no-cache
aws s3 cp build/ s3://$(tofu output -raw s3_bucket_name)/ \
  --recursive \
  --exclude "index.html" \
  --exclude "static/*" \
  --cache-control "no-cache, no-store, must-revalidate"

# Upload index.html with no-cache so browsers revalidate it
aws s3 cp build/index.html s3://$(tofu output -raw s3_bucket_name)/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Invalidate CloudFront cache if you want to purge cached responses immediately
aws cloudfront create-invalidation \
  --distribution-id $(tofu output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Summary

Deploying React to S3 + CloudFront with OpenTofu provides global CDN performance at minimal cost. Key points: block all public S3 access and use CloudFront Origin Access Control for security, configure custom error responses to return `index.html` for React Router SPA navigation, set long cache headers only for content-hashed `/static/*` assets while using `no-cache` for `index.html` and other non-hashed files, and invalidate CloudFront when you need to purge cached responses immediately.
