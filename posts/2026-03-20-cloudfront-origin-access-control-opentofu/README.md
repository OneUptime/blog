# How to Set Up CloudFront Origin Access Control with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudFront, OAC, S3 Security, Infrastructure as Code

Description: Learn how to configure CloudFront Origin Access Control for S3 origins using the modern SigV4 signing approach with OpenTofu.

## Introduction

Origin Access Control (OAC) is the modern, recommended replacement for Origin Access Identity (OAI) for S3 origins. It uses AWS SigV4 signing. For S3 origins, OAC supports server-side encryption with AWS KMS and dynamic requests, and CloudFront also supports OAC for MediaStore, MediaPackage v2, and Lambda function URL origins. OpenTofu manages OAC creation and distribution configuration.

## Creating an OAC

```hcl
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${var.app_name}-oac"
  description                       = "OAC for ${var.app_name} S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"   # always sign requests to origin
  signing_protocol                  = "sigv4"
}

# OAC for Elemental MediaStore

resource "aws_cloudfront_origin_access_control" "mediastore" {
  name                              = "${var.app_name}-mediastore-oac"
  origin_access_control_origin_type = "mediastore"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

## S3 Bucket with KMS Encryption

```hcl
resource "aws_s3_bucket" "website" {
  bucket = "${var.app_name}-website-${var.account_id}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Bucket Policy for OAC

OAC uses the CloudFront distribution's ARN in the bucket policy condition.

```hcl
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })
}
```

## KMS Key Policy for CloudFront

Allow CloudFront to use the KMS key for objects encrypted with SSE-KMS.

```hcl
resource "aws_kms_key" "s3" {
  description             = "KMS key for ${var.app_name} S3 bucket"
  deletion_window_in_days = 7
}

resource "aws_kms_key_policy" "s3" {
  key_id = aws_kms_key.s3.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey*"]
        Resource  = "*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })
}
```

## CloudFront Distribution with OAC

```hcl
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
    # Note: no s3_origin_config block needed with OAC
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # CachingOptimized
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
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

CloudFront OAC is the modern, recommended approach for securing S3 origins. It supports KMS-encrypted buckets and uses SigV4 signing. OpenTofu manages the OAC, bucket policy with distribution ARN conditions, and KMS key policies together - providing a secure, reproducible CDN configuration.
