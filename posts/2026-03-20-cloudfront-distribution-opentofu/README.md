# How to Create a CloudFront Distribution with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, CloudFront, CDN

Description: Learn how to create and configure an AWS CloudFront distribution using OpenTofu to serve content globally with low latency and high availability.

## Introduction

Amazon CloudFront is a content delivery network (CDN) service that accelerates delivery of your websites, APIs, and media files. With OpenTofu, you can codify your CloudFront distribution configuration for repeatable, version-controlled deployments.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured
- An S3 bucket or other origin

## Project Structure

```text
cloudfront-example/
├── main.tf
├── variables.tf
└── outputs.tf
```

## Step 1: Configure the Provider

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"  # Example region for origin resources; CloudFront viewer ACM certs must be in us-east-1
}
```

## Step 2: Create an S3 Origin Bucket

```hcl
# S3 bucket for static website content
resource "aws_s3_bucket" "website" {
  bucket = var.bucket_name

  tags = {
    Name = "website-origin"
  }
}

# Block public access - CloudFront will use OAC
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Step 3: Create Origin Access Control

```hcl
# Origin Access Control (OAC) - modern replacement for OAI
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "website-oac"
  description                       = "OAC for website S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

## Step 4: Create the CloudFront Distribution

```hcl
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Website CloudFront Distribution"
  default_root_object = "index.html"

  # S3 origin configuration
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.website.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.website.id}"
    viewer_protocol_policy = "redirect-to-https"

    # Cache policy settings
    min_ttl     = 0
    default_ttl = 3600   # 1 hour
    max_ttl     = 86400  # 24 hours

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # Custom error pages for SPA routing
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"  # Change to "whitelist" or "blacklist" as needed
    }
  }

  # SSL certificate configuration
  viewer_certificate {
    cloudfront_default_certificate = true  # Use custom ACM cert for production
  }

  tags = {
    Environment = "production"
  }
}
```

## Step 5: Grant CloudFront Access to S3

```hcl
# S3 bucket policy to allow CloudFront OAC access
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}
```

## Step 6: Outputs

```hcl
output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully created a CloudFront distribution backed by S3 using OpenTofu. The setup uses modern Origin Access Control (OAC) for secure S3 access, includes HTTPS redirection, and configures custom error responses for SPA applications. For production, add a custom domain with an ACM certificate for branded URLs.
