# How to Set Up S3 Static Website Hosting with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Static Website, CloudFront, Infrastructure as Code, Web Hosting

Description: Learn how to host a static website on S3 with CloudFront CDN using OpenTofu for fast, globally distributed, and cost-effective web hosting.

## Introduction

This pattern stores HTML, CSS, JavaScript, and media files in a private S3 bucket and serves them through CloudFront. With CloudFront, you get a globally distributed CDN with HTTPS, custom domains, and edge caching. This is the standard pattern for hosting single-page applications and static sites on AWS.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3, CloudFront, and Route 53 permissions
- A registered domain and ACM certificate in us-east-1 (for custom domains)

## Step 1: Create the S3 Origin Bucket

```hcl
resource "aws_s3_bucket" "website" {
  bucket = var.website_bucket_name
  tags   = { Name = "static-website" }
}
```

## Step 2: Configure Bucket Policy for CloudFront

```hcl
# Keep direct public S3 access blocked - all traffic goes through CloudFront OAC
resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${var.website_bucket_name}-oac"
  description                       = "Origin Access Control for website bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Bucket policy allowing CloudFront OAC to read objects
resource "aws_s3_bucket_policy" "website_cf" {
  bucket     = aws_s3_bucket.website.id
  depends_on = [aws_s3_bucket_public_access_block.website]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontServicePrincipal"
      Effect = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
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

## Step 3: Create CloudFront Distribution

```hcl
resource "aws_cloudfront_distribution" "website" {
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.website.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.bucket}"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "website-distribution" }
}
```

## Step 4: Configure DNS

```hcl
resource "aws_route53_record" "website" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "website_ipv6" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Upload website files
aws s3 sync ./dist/ s3://my-website-bucket/ --delete

# Invalidate CloudFront cache after deployment
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/*"
```

## Conclusion

S3 + CloudFront is the gold standard for hosting static websites and SPAs on AWS. Use Origin Access Control to prevent direct S3 access, configure custom error responses to support client-side routing, and set appropriate cache TTLs for your assets. For CI/CD, automate the S3 sync and CloudFront invalidation steps in your pipeline after every build.
