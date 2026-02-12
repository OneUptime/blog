# How to Create CloudFront Distributions with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, CloudFront, CDN

Description: A practical guide to creating and configuring AWS CloudFront distributions with Terraform, including S3 origins, caching, SSL, and custom domains.

---

CloudFront is AWS's content delivery network, and it does a lot more than just caching static files. It handles SSL termination, custom domains, request routing, edge functions, and geographic restrictions. But configuring CloudFront through the console is painful - there are dozens of settings spread across multiple screens. Terraform turns all of that into a single, readable configuration file.

Let's walk through building CloudFront distributions for the two most common use cases: serving a static website from S3, and putting CloudFront in front of an API.

## CloudFront with S3 Origin

The most common pattern is serving static assets from an S3 bucket through CloudFront. Here's the full setup.

First, create the S3 bucket and an Origin Access Control (OAC) so CloudFront can access the bucket without making it public:

```hcl
# S3 bucket for static assets
resource "aws_s3_bucket" "website" {
  bucket = "my-website-assets-2026"
}

# Block all public access - CloudFront will access via OAC
resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Origin Access Control for secure S3 access
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "s3-oac"
  description                       = "OAC for S3 website bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

Now create the CloudFront distribution itself:

```hcl
# CloudFront distribution serving from S3
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "Website CDN"
  price_class         = "PriceClass_100"

  # S3 origin configuration
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "s3-website"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-website"
    viewer_protocol_policy = "redirect-to-https"

    # Use a managed cache policy
    cache_policy_id          = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    origin_request_policy_id = "88a5eaf4-2f7a-4f8b-9c46-8c48c0a17bf1" # CORS-S3Origin

    compress = true
  }

  # Custom error response for SPA routing
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
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

The `custom_error_response` blocks are essential for single-page applications. When a user refreshes on `/dashboard`, S3 returns a 404 because there's no `dashboard` object. These rules redirect 403 and 404 errors back to `index.html`, letting your client-side router handle the path.

## S3 Bucket Policy for CloudFront

The bucket needs a policy that allows CloudFront to read from it:

```hcl
# Bucket policy allowing CloudFront access via OAC
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

## Custom Domain and SSL

For production, you'll want a custom domain with an SSL certificate. CloudFront requires the ACM certificate to be in `us-east-1`, regardless of where your other resources are.

This sets up a custom domain with a validated ACM certificate:

```hcl
# ACM certificate must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "cdn" {
  provider          = aws.us_east_1
  domain_name       = "cdn.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Update the distribution to use custom domain
resource "aws_cloudfront_distribution" "website_custom" {
  # ... same as above, but add:

  aliases = ["cdn.example.com"]

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cdn.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # ... rest of configuration
}
```

For a detailed guide on certificate management, see our post on [managing ACM certificates with Terraform](https://oneuptime.com/blog/post/manage-aws-acm-certificates-with-terraform/view).

## CloudFront with API Origin

You can also put CloudFront in front of your API to improve performance globally. This is useful for APIs that serve users across multiple regions.

This sets up CloudFront with an API Gateway or ALB origin:

```hcl
# CloudFront in front of an API
resource "aws_cloudfront_distribution" "api" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "API CDN"

  origin {
    domain_name = "api.internal.example.com"
    origin_id   = "api-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "api-origin"
    viewer_protocol_policy = "https-only"

    # Don't cache API responses by default
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader

    compress = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

Notice we're using the `CachingDisabled` policy for API requests. You don't want CloudFront caching your dynamic API responses unless you've specifically designed for it.

## Multiple Origins with Path-Based Routing

A powerful pattern is using a single CloudFront distribution with multiple origins, routing requests based on the URL path:

```hcl
# Distribution with multiple origins
resource "aws_cloudfront_distribution" "multi" {
  enabled             = true
  default_root_object = "index.html"

  # Static assets from S3
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "s3-static"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  # API backend
  origin {
    domain_name = "api.internal.example.com"
    origin_id   = "api-backend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default: serve static files from S3
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-static"
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    compress               = true
  }

  # /api/* routes go to the backend
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "api-backend"
    viewer_protocol_policy = "https-only"
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

## Cache Invalidation

Terraform doesn't handle cache invalidation natively. You'll need to run invalidations separately after deploying new content. Here's a quick approach using a null resource:

```hcl
# Invalidate cache after deployment (use with caution)
resource "null_resource" "invalidate_cache" {
  triggers = {
    # Trigger when content changes
    content_hash = data.archive_file.website_content.output_md5
  }

  provisioner "local-exec" {
    command = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.website.id} --paths '/*'"
  }
}
```

Be careful with wildcard invalidations - they cost money beyond the first 1,000 paths per month.

## Wrapping Up

CloudFront distributions have a lot of knobs to turn, but Terraform keeps the configuration manageable and reproducible. Start with S3 origin for static sites, add custom domains when you're ready for production, and consider multi-origin setups when you want a single domain for both your frontend and API. Always use Origin Access Control instead of the older Origin Access Identity - it's more secure and supports more features.
