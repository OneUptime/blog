# How to Create S3 Static Website Hosting in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, S3, Static Website, CloudFront

Description: A complete guide to hosting static websites on S3 with Terraform, covering basic hosting, custom domains, CloudFront CDN integration, SSL certificates, and deployment automation.

---

S3 is one of the cheapest and most reliable ways to host a static website. No servers to manage, automatic scaling, and 99.999999999% durability for your files. Whether it's a marketing site, documentation, or a single-page application, S3 static hosting handles it with minimal configuration.

This guide covers everything from basic S3 website hosting to a production setup with CloudFront, custom domains, and HTTPS.

## Basic S3 Website Hosting

The simplest setup: an S3 bucket configured to serve web pages.

```hcl
provider "aws" {
  region = "us-east-1"
}

# Create the S3 bucket for the website
resource "aws_s3_bucket" "website" {
  bucket = "my-awesome-website-2026"  # Must be globally unique

  tags = {
    Name = "static-website"
  }
}

# Configure the bucket for static website hosting
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

# Allow public read access (needed for direct S3 website hosting)
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket policy for public read access
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.website.arn}/*"
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.website]
}

# Output the website endpoint
output "website_url" {
  value       = aws_s3_bucket_website_configuration.website.website_endpoint
  description = "S3 website endpoint URL"
}
```

After applying, upload your files:

```bash
# Upload your static files
aws s3 sync ./build/ s3://my-awesome-website-2026 --delete

# Or upload individual files
aws s3 cp index.html s3://my-awesome-website-2026/index.html
aws s3 cp error.html s3://my-awesome-website-2026/error.html
```

The website will be available at `http://my-awesome-website-2026.s3-website-us-east-1.amazonaws.com`.

## Routing Rules

Configure redirects and URL rewriting at the S3 level.

```hcl
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }

  # Redirect old blog paths to new ones
  routing_rule {
    condition {
      key_prefix_equals = "blog/"
    }
    redirect {
      replace_key_prefix_with = "posts/"
      http_redirect_code      = "301"
    }
  }

  # Redirect all 404s to index.html (useful for SPAs)
  routing_rule {
    condition {
      http_error_code_returned_equals = "404"
    }
    redirect {
      replace_key_with   = "index.html"
      http_redirect_code = "200"
    }
  }
}
```

## Production Setup with CloudFront

For production websites, use CloudFront in front of S3. This gives you HTTPS, custom domains, caching, and keeps your S3 bucket private.

```hcl
# S3 bucket - kept private (no public access)
resource "aws_s3_bucket" "website" {
  bucket_prefix = "website-"
}

# Block all public access - CloudFront accesses the bucket directly
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Origin Access Control for CloudFront
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "website-oac"
  description                       = "OAC for static website"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "Static website distribution"

  # S3 origin
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "s3-website"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-website"
    viewer_protocol_policy = "redirect-to-https"

    # Use managed caching policy for optimal performance
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # CachingOptimized

    compress = true
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
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "website-cdn"
  }
}

# Bucket policy allowing CloudFront to read objects
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipal"
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

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.website.domain_name}"
}
```

## Custom Domain with SSL

Add a custom domain with an SSL certificate from ACM.

```hcl
# SSL certificate (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "website" {
  provider          = aws.us_east_1
  domain_name       = "www.example.com"
  validation_method = "DNS"

  subject_alternative_names = [
    "example.com",
  ]

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.website.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Certificate validation
resource "aws_acm_certificate_validation" "website" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.website.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront with custom domain
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # Custom domain names
  aliases = ["www.example.com", "example.com"]

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "s3-website"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-website"
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    compress               = true
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Custom SSL certificate
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.website.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# DNS records pointing to CloudFront
resource "aws_route53_record" "website" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# Apex domain
resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Uploading Website Files with Terraform

You can manage website files directly in Terraform for small sites.

```hcl
# Map file extensions to MIME types
locals {
  mime_types = {
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
  }
}

# Upload all files from the build directory
resource "aws_s3_object" "website_files" {
  for_each = fileset("${path.module}/build", "**/*")

  bucket       = aws_s3_bucket.website.id
  key          = each.value
  source       = "${path.module}/build/${each.value}"
  etag         = filemd5("${path.module}/build/${each.value}")
  content_type = lookup(local.mime_types, regex("\\.[^.]+$", each.value), "application/octet-stream")
}
```

For larger sites, use a deployment script instead:

```bash
#!/bin/bash
# deploy.sh - Build and deploy the website

# Build the site
npm run build

# Sync to S3
aws s3 sync ./build/ s3://${BUCKET_NAME} \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html" \
  --exclude "*.json"

# Upload HTML files with shorter cache
aws s3 sync ./build/ s3://${BUCKET_NAME} \
  --exclude "*" \
  --include "*.html" \
  --include "*.json" \
  --cache-control "public, max-age=0, must-revalidate"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

## Redirect www to Apex (or Vice Versa)

```hcl
# Redirect bucket: www.example.com -> example.com
resource "aws_s3_bucket" "redirect" {
  bucket = "www.example.com"
}

resource "aws_s3_bucket_website_configuration" "redirect" {
  bucket = aws_s3_bucket.redirect.id

  redirect_all_requests_to {
    host_name = "example.com"
    protocol  = "https"
  }
}
```

## Summary

For simple sites, direct S3 website hosting works with just a bucket, website configuration, and public bucket policy. For anything going to production, put CloudFront in front - you get HTTPS, caching, custom domains, and the bucket stays private. The combination of S3 + CloudFront + ACM + Route 53 gives you a fast, secure, and inexpensive hosting solution that can serve millions of requests without breaking a sweat.

For more S3 configuration, see our guides on [configuring S3 bucket policies](https://oneuptime.com/blog/post/2026-02-23-configure-s3-bucket-policies-in-terraform/view) and [blocking public access to S3 buckets](https://oneuptime.com/blog/post/2026-02-23-block-public-access-to-s3-buckets-in-terraform/view).
