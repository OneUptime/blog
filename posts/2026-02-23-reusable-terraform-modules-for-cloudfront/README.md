# How to Create Reusable Terraform Modules for CloudFront

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, CloudFront, CDN

Description: Build a reusable Terraform module for AWS CloudFront distributions with S3 origins, custom origins, cache behaviors, SSL certificates, and WAF integration.

---

CloudFront distributions have one of the longest Terraform resource definitions in the AWS provider. Between origins, cache behaviors, SSL configuration, geo restrictions, error pages, and logging, a single distribution can easily span 100+ lines of HCL. A module that wraps this complexity with sensible defaults is essential for any team deploying multiple CloudFront distributions.

## What the Module Should Cover

At its core, the module needs to support:

- S3 bucket origins with Origin Access Control
- Custom origins (ALB, API Gateway, custom servers)
- Default and additional cache behaviors
- SSL certificate attachment
- Custom error responses
- Access logging
- Optional WAF web ACL association

## Module Structure

```text
modules/cloudfront/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
```

## Variables

```hcl
# modules/cloudfront/variables.tf

variable "comment" {
  description = "Comment for the distribution (shows in console)"
  type        = string
  default     = ""
}

variable "aliases" {
  description = "Alternate domain names (CNAMEs) for the distribution"
  type        = list(string)
  default     = []
}

variable "certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1 for CloudFront)"
  type        = string
  default     = null
}

variable "default_root_object" {
  description = "Default root object (e.g., index.html)"
  type        = string
  default     = "index.html"
}

variable "enabled" {
  description = "Whether the distribution is enabled"
  type        = bool
  default     = true
}

variable "price_class" {
  description = "Price class for the distribution"
  type        = string
  default     = "PriceClass_100"  # US, Canada, Europe only

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class must be PriceClass_100, PriceClass_200, or PriceClass_All"
  }
}

# S3 origin configuration
variable "s3_origin" {
  description = "S3 bucket origin configuration"
  type = object({
    bucket_id              = string
    bucket_arn             = string
    bucket_domain_name     = string
    origin_path            = optional(string, "")
  })
  default = null
}

# Custom origin configuration (ALB, API Gateway, etc.)
variable "custom_origins" {
  description = "Custom origins for the distribution"
  type = list(object({
    origin_id          = string
    domain_name        = string
    origin_path        = optional(string, "")
    http_port          = optional(number, 80)
    https_port         = optional(number, 443)
    origin_protocol    = optional(string, "https-only")
    origin_ssl_protocols = optional(list(string), ["TLSv1.2"])
  }))
  default = []
}

# Default cache behavior
variable "default_cache_behavior" {
  description = "Default cache behavior settings"
  type = object({
    target_origin_id       = string
    viewer_protocol_policy = optional(string, "redirect-to-https")
    allowed_methods        = optional(list(string), ["GET", "HEAD", "OPTIONS"])
    cached_methods         = optional(list(string), ["GET", "HEAD"])
    compress               = optional(bool, true)
    default_ttl            = optional(number, 86400)
    max_ttl                = optional(number, 31536000)
    min_ttl                = optional(number, 0)
    cache_policy_id        = optional(string, null)
    origin_request_policy_id = optional(string, null)
  })
}

# Additional cache behaviors for path-based routing
variable "ordered_cache_behaviors" {
  description = "Additional cache behaviors (ordered by priority)"
  type = list(object({
    path_pattern           = string
    target_origin_id       = string
    viewer_protocol_policy = optional(string, "redirect-to-https")
    allowed_methods        = optional(list(string), ["GET", "HEAD", "OPTIONS"])
    cached_methods         = optional(list(string), ["GET", "HEAD"])
    compress               = optional(bool, true)
    default_ttl            = optional(number, 86400)
    max_ttl                = optional(number, 31536000)
    min_ttl                = optional(number, 0)
    cache_policy_id        = optional(string, null)
  }))
  default = []
}

variable "custom_error_responses" {
  description = "Custom error response configurations"
  type = list(object({
    error_code            = number
    response_code         = optional(number)
    response_page_path    = optional(string)
    error_caching_min_ttl = optional(number, 300)
  }))
  default = []
}

variable "web_acl_id" {
  description = "WAF web ACL ID to associate with the distribution"
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

## Main Resource

```hcl
# modules/cloudfront/main.tf

# Origin Access Control for S3 origins
resource "aws_cloudfront_origin_access_control" "s3" {
  count = var.s3_origin != null ? 1 : 0

  name                              = "oac-${var.s3_origin.bucket_id}"
  description                       = "OAC for ${var.s3_origin.bucket_id}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 bucket policy to allow CloudFront access
data "aws_iam_policy_document" "s3_policy" {
  count = var.s3_origin != null ? 1 : 0

  statement {
    actions   = ["s3:GetObject"]
    resources = ["${var.s3_origin.bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "origin" {
  count = var.s3_origin != null ? 1 : 0

  bucket = var.s3_origin.bucket_id
  policy = data.aws_iam_policy_document.s3_policy[0].json
}

# The CloudFront distribution
resource "aws_cloudfront_distribution" "this" {
  comment             = var.comment
  enabled             = var.enabled
  default_root_object = var.default_root_object
  aliases             = var.aliases
  price_class         = var.price_class
  web_acl_id          = var.web_acl_id

  # S3 origin (if configured)
  dynamic "origin" {
    for_each = var.s3_origin != null ? [var.s3_origin] : []

    content {
      origin_id                = var.s3_origin.bucket_id
      domain_name              = origin.value.bucket_domain_name
      origin_path              = origin.value.origin_path
      origin_access_control_id = aws_cloudfront_origin_access_control.s3[0].id
    }
  }

  # Custom origins
  dynamic "origin" {
    for_each = var.custom_origins

    content {
      origin_id   = origin.value.origin_id
      domain_name = origin.value.domain_name
      origin_path = origin.value.origin_path

      custom_origin_config {
        http_port              = origin.value.http_port
        https_port             = origin.value.https_port
        origin_protocol_policy = origin.value.origin_protocol
        origin_ssl_protocols   = origin.value.origin_ssl_protocols
      }
    }
  }

  # Default cache behavior
  default_cache_behavior {
    target_origin_id       = var.default_cache_behavior.target_origin_id
    viewer_protocol_policy = var.default_cache_behavior.viewer_protocol_policy
    allowed_methods        = var.default_cache_behavior.allowed_methods
    cached_methods         = var.default_cache_behavior.cached_methods
    compress               = var.default_cache_behavior.compress

    # Use cache policy if specified, otherwise use TTL values
    cache_policy_id          = var.default_cache_behavior.cache_policy_id
    origin_request_policy_id = var.default_cache_behavior.origin_request_policy_id

    # TTL values (ignored when cache_policy_id is set)
    default_ttl = var.default_cache_behavior.cache_policy_id == null ? var.default_cache_behavior.default_ttl : null
    max_ttl     = var.default_cache_behavior.cache_policy_id == null ? var.default_cache_behavior.max_ttl : null
    min_ttl     = var.default_cache_behavior.cache_policy_id == null ? var.default_cache_behavior.min_ttl : null

    # Use forwarded values when no cache policy is set
    dynamic "forwarded_values" {
      for_each = var.default_cache_behavior.cache_policy_id == null ? [1] : []

      content {
        query_string = false

        cookies {
          forward = "none"
        }
      }
    }
  }

  # Additional cache behaviors
  dynamic "ordered_cache_behavior" {
    for_each = var.ordered_cache_behaviors

    content {
      path_pattern           = ordered_cache_behavior.value.path_pattern
      target_origin_id       = ordered_cache_behavior.value.target_origin_id
      viewer_protocol_policy = ordered_cache_behavior.value.viewer_protocol_policy
      allowed_methods        = ordered_cache_behavior.value.allowed_methods
      cached_methods         = ordered_cache_behavior.value.cached_methods
      compress               = ordered_cache_behavior.value.compress

      cache_policy_id = ordered_cache_behavior.value.cache_policy_id

      dynamic "forwarded_values" {
        for_each = ordered_cache_behavior.value.cache_policy_id == null ? [1] : []

        content {
          query_string = false
          cookies {
            forward = "none"
          }
        }
      }
    }
  }

  # Custom error responses
  dynamic "custom_error_response" {
    for_each = var.custom_error_responses

    content {
      error_code            = custom_error_response.value.error_code
      response_code         = custom_error_response.value.response_code
      response_page_path    = custom_error_response.value.response_page_path
      error_caching_min_ttl = custom_error_response.value.error_caching_min_ttl
    }
  }

  # SSL configuration
  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = var.certificate_arn != null ? "sni-only" : null
    minimum_protocol_version = var.certificate_arn != null ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = var.certificate_arn == null ? true : false
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = var.tags
}
```

## Outputs

```hcl
# modules/cloudfront/outputs.tf

output "distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.id
}

output "domain_name" {
  description = "The domain name of the distribution"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "hosted_zone_id" {
  description = "The hosted zone ID of the distribution (for Route53 alias)"
  value       = aws_cloudfront_distribution.this.hosted_zone_id
}

output "arn" {
  description = "The ARN of the distribution"
  value       = aws_cloudfront_distribution.this.arn
}
```

## Usage: Static Website

```hcl
module "website_cdn" {
  source = "./modules/cloudfront"

  comment             = "Company marketing website"
  aliases             = ["www.example.com"]
  certificate_arn     = aws_acm_certificate.website.arn
  default_root_object = "index.html"

  s3_origin = {
    bucket_id          = module.website_bucket.bucket_id
    bucket_arn         = module.website_bucket.bucket_arn
    bucket_domain_name = module.website_bucket.bucket_regional_domain_name
  }

  default_cache_behavior = {
    target_origin_id = module.website_bucket.bucket_id
  }

  # SPA routing - serve index.html for 404s
  custom_error_responses = [
    {
      error_code         = 404
      response_code      = 200
      response_page_path = "/index.html"
    },
    {
      error_code         = 403
      response_code      = 200
      response_page_path = "/index.html"
    }
  ]

  tags = {
    Environment = "production"
    Service     = "website"
  }
}
```

## Important Notes on CloudFront Modules

CloudFront distributions take 15-30 minutes to deploy, so plan your development cycle accordingly. Also, ACM certificates used with CloudFront must be in the `us-east-1` region regardless of where your other infrastructure lives.

The module uses Origin Access Control (OAC) instead of the older Origin Access Identity (OAI) for S3 origins. OAC is the recommended approach and supports SSE-KMS encrypted objects, which OAI does not.

For connecting CloudFront to a custom domain, see [how to create reusable Terraform modules for DNS records](https://oneuptime.com/blog/post/2026-02-23-reusable-terraform-modules-for-dns-records/view).
