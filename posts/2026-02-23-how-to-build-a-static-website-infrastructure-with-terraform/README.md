# How to Build a Static Website Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Static Website, S3, CloudFront, AWS, Infrastructure Patterns

Description: Build production-ready static website infrastructure with Terraform using S3, CloudFront, ACM certificates, and Route53 for fast, secure, and cost-effective hosting.

---

Static websites are everywhere. Documentation sites, marketing pages, single-page applications, blogs - they all share the same infrastructure pattern. An S3 bucket for storage, CloudFront for global distribution, an SSL certificate for HTTPS, and DNS records to tie it together.

Setting this up manually through the AWS console is tedious, and doing it for multiple sites means repeating the same steps over and over. Terraform lets you define this pattern once and reuse it. In this guide, we will build a complete static website hosting infrastructure that you can stamp out for any new site in minutes.

## Architecture

The architecture is straightforward:

- S3 bucket stores the website files
- CloudFront distribution serves them globally with caching
- ACM certificate provides HTTPS
- Route53 manages DNS
- Optional: Lambda@Edge for URL rewriting

## S3 Bucket Configuration

The S3 bucket holds your static files. With CloudFront in front, you do not need to enable S3 static website hosting. Instead, use an Origin Access Identity so only CloudFront can read from the bucket:

```hcl
# S3 bucket for website content
resource "aws_s3_bucket" "website" {
  bucket = "${var.domain_name}-website"

  tags = {
    Site = var.domain_name
  }
}

# Block all public access - CloudFront handles serving
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning for rollback capability
resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Origin Access Control for CloudFront
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${var.domain_name}-oac"
  description                       = "OAC for ${var.domain_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Bucket policy allowing only CloudFront to read
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
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
      }
    ]
  })
}
```

## SSL Certificate

ACM certificates for CloudFront must be in us-east-1:

```hcl
# Certificate must be in us-east-1 for CloudFront
resource "aws_acm_certificate" "website" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method = "DNS"

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

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.hosted_zone_id
}

resource "aws_acm_certificate_validation" "website" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.website.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

## CloudFront Distribution

The CDN configuration handles caching, HTTPS, and custom error pages:

```hcl
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name, "www.${var.domain_name}"]
  price_class         = "PriceClass_100" # US, Canada, Europe
  comment             = "Static website for ${var.domain_name}"

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
    compress               = true

    # Use the CachingOptimized managed policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    # Security headers
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # Handle SPA routing - return index.html for 404s
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 403
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
    acm_certificate_arn      = aws_acm_certificate_validation.website.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Site = var.domain_name
  }
}

# Security headers policy
resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${replace(var.domain_name, ".", "-")}-security-headers"
  comment = "Security headers for ${var.domain_name}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
}
```

## DNS Records

Point your domain to the CloudFront distribution:

```hcl
# Apex domain
resource "aws_route53_record" "apex" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# www subdomain
resource "aws_route53_record" "www" {
  zone_id = var.hosted_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Cache Invalidation

When you deploy new content, you need to invalidate the CloudFront cache. While Terraform does not manage this directly, you can trigger it from your CI/CD pipeline. For building that pipeline infrastructure, see our guide on [building CI/CD infrastructure with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-ci-cd-infrastructure-with-terraform/view).

## Reusable Module

Package everything as a module so creating a new static site is a one-liner:

```hcl
module "docs_site" {
  source         = "./modules/static_website"
  domain_name    = "docs.example.com"
  hosted_zone_id = var.hosted_zone_id
}

module "marketing_site" {
  source         = "./modules/static_website"
  domain_name    = "www.example.com"
  hosted_zone_id = var.hosted_zone_id
}
```

## Wrapping Up

Static website hosting on AWS is one of the most common infrastructure patterns, and Terraform makes it completely repeatable. The setup we built handles HTTPS, global CDN distribution, security headers, and SPA routing. Package it as a module and you can spin up new sites in minutes. The total cost for a moderate-traffic static site is usually just a few dollars per month, making it one of the most cost-effective hosting options available.
