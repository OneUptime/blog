# How to Create S3 Bucket with CORS Configuration in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, S3, CORS, Web Development

Description: Learn how to configure CORS rules on S3 buckets using Terraform, including common patterns for web apps, fonts, API uploads, and troubleshooting CORS issues.

---

Cross-Origin Resource Sharing (CORS) is one of those things that works invisibly when configured correctly and causes frustrating errors when it's not. If your web application hosted on `app.example.com` needs to load images, fonts, or make API calls to files in an S3 bucket, you need CORS rules on that bucket. Without them, the browser blocks the requests.

This guide covers how to configure CORS on S3 buckets in Terraform, with practical examples for common scenarios.

## How CORS Works with S3

When a browser makes a cross-origin request (e.g., JavaScript on `app.example.com` fetching a file from your S3 bucket), it first sends a preflight OPTIONS request. S3 checks the request against your CORS rules and either returns the appropriate CORS headers (allowing the request) or returns an error (blocking it).

The key CORS headers are:
- **Access-Control-Allow-Origin** - Which origins can access the resource
- **Access-Control-Allow-Methods** - Which HTTP methods are allowed
- **Access-Control-Allow-Headers** - Which custom headers can be sent
- **Access-Control-Expose-Headers** - Which response headers the browser can access
- **Access-Control-Max-Age** - How long the browser can cache the preflight response

## Basic CORS Configuration

A simple CORS rule that allows GET requests from a specific domain.

```hcl
# Create the S3 bucket
resource "aws_s3_bucket" "assets" {
  bucket_prefix = "app-assets-"

  tags = {
    Name = "application-assets"
  }
}

# Configure CORS rules
resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://app.example.com"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}
```

Let's break down each field:
- **allowed_headers** - `["*"]` allows any header in the request. You can restrict this to specific headers like `["Content-Type", "Authorization"]`.
- **allowed_methods** - HTTP methods the origin can use. Common: `GET`, `PUT`, `POST`, `DELETE`, `HEAD`.
- **allowed_origins** - The exact origin(s) allowed. Include the protocol (`https://`).
- **expose_headers** - Response headers that JavaScript can read. S3 doesn't expose headers by default.
- **max_age_seconds** - Browser caches the preflight response for this many seconds, reducing OPTIONS requests.

## CORS for Web Application File Uploads

When your frontend needs to upload files directly to S3 (using pre-signed URLs), you need PUT and POST methods.

```hcl
resource "aws_s3_bucket" "uploads" {
  bucket_prefix = "user-uploads-"
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  # Rule for file uploads from the web app
  cors_rule {
    allowed_headers = [
      "Content-Type",
      "Content-Length",
      "Content-Disposition",
      "x-amz-acl",
      "x-amz-meta-*",  # Allow custom metadata headers
    ]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = [
      "https://app.example.com",
      "https://staging.example.com",
    ]
    expose_headers = [
      "ETag",
      "x-amz-request-id",
      "x-amz-version-id",
    ]
    max_age_seconds = 3600
  }
}
```

Your frontend code would use a pre-signed URL to upload:

```javascript
// Frontend code to upload a file using a pre-signed URL
async function uploadFile(file) {
  // Get a pre-signed URL from your backend
  const response = await fetch('/api/upload-url', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
  const { uploadUrl } = await response.json();

  // Upload directly to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
}
```

## CORS for Font Files

Web fonts loaded from S3 require CORS. Without it, browsers block the font download with a CORS error, and your text renders in a fallback font.

```hcl
resource "aws_s3_bucket" "cdn_assets" {
  bucket_prefix = "cdn-assets-"
}

resource "aws_s3_bucket_cors_configuration" "cdn_assets" {
  bucket = aws_s3_bucket.cdn_assets.id

  # Rule for fonts
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = [
      "https://www.example.com",
      "https://example.com",
      "https://app.example.com",
    ]
    expose_headers  = [
      "Content-Length",
      "Content-Type",
      "ETag",
    ]
    max_age_seconds = 86400  # Cache preflight for 24 hours since fonts rarely change
  }

  # Rule for other static assets (images, CSS, JS)
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]  # More permissive for non-sensitive assets
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}
```

## Multiple CORS Rules

S3 supports multiple CORS rules on a single bucket. S3 evaluates them in order and uses the first rule that matches the request's origin and method.

```hcl
resource "aws_s3_bucket_cors_configuration" "multi_rule" {
  bucket = aws_s3_bucket.api_data.id

  # Rule 1: Internal admin app - full access
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["https://admin.example.com"]
    expose_headers = [
      "ETag",
      "x-amz-request-id",
      "x-amz-version-id",
      "Content-Length",
    ]
    max_age_seconds = 3600
  }

  # Rule 2: Public website - read only
  cors_rule {
    allowed_headers = ["Authorization", "Content-Type"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = [
      "https://www.example.com",
      "https://example.com",
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 86400
  }

  # Rule 3: Partner integrations - limited access
  cors_rule {
    allowed_headers = ["Authorization", "Content-Type", "X-Partner-ID"]
    allowed_methods = ["GET", "PUT"]
    allowed_origins = [
      "https://partner1.com",
      "https://partner2.com",
    ]
    expose_headers  = ["ETag", "x-amz-version-id"]
    max_age_seconds = 600
  }
}
```

## Dynamic CORS Origins

If your allowed origins come from a variable (useful for multi-tenant applications or per-environment configuration).

```hcl
variable "cors_allowed_origins" {
  type        = list(string)
  description = "Origins allowed to access the S3 bucket"
  default     = [
    "https://app.example.com",
    "https://staging.example.com",
  ]
}

variable "cors_methods" {
  type        = list(string)
  description = "HTTP methods allowed for CORS"
  default     = ["GET", "HEAD"]
}

resource "aws_s3_bucket_cors_configuration" "dynamic" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = var.cors_methods
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}
```

For development, you might add `http://localhost:3000`:

```hcl
# terraform.tfvars for development
cors_allowed_origins = [
  "https://app.example.com",
  "https://staging.example.com",
  "http://localhost:3000",
  "http://localhost:5173",
]
```

## CORS with CloudFront

When CloudFront sits in front of S3, you need to configure CloudFront to forward the CORS-related headers.

```hcl
resource "aws_cloudfront_distribution" "assets" {
  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "s3-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"

    # Use a cache policy that forwards the Origin header
    # This is required for CORS to work through CloudFront
    cache_policy_id = aws_cloudfront_cache_policy.cors.id

    compress = true
  }

  # ... rest of distribution config
  enabled         = true
  is_ipv6_enabled = true

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Custom cache policy that includes Origin header for CORS
resource "aws_cloudfront_cache_policy" "cors" {
  name    = "cors-cache-policy"
  comment = "Cache policy that forwards Origin header for CORS"

  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = [
          "Origin",
          "Access-Control-Request-Method",
          "Access-Control-Request-Headers",
        ]
      }
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}
```

Without forwarding the `Origin` header, CloudFront caches the S3 response without CORS headers, and subsequent requests from different origins get the cached (headerless) response.

## Troubleshooting CORS Issues

When CORS isn't working, check these things:

```bash
# Test a CORS preflight request manually
curl -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  https://my-bucket.s3.amazonaws.com/test-key

# Check the CORS configuration on the bucket
aws s3api get-bucket-cors --bucket my-bucket

# Test a GET request with Origin header
curl -H "Origin: https://app.example.com" \
  -v \
  https://my-bucket.s3.amazonaws.com/test-file.json
```

Common issues:
1. **Missing protocol** in allowed_origins - `example.com` won't work, must be `https://example.com`
2. **Trailing slash** - `https://example.com/` won't match `https://example.com`
3. **CloudFront not forwarding Origin header** - Need the right cache policy
4. **Browser caching old preflight response** - Clear browser cache or wait for `max_age_seconds` to expire
5. **OPTIONS method not allowed** - Some configurations forget to include OPTIONS in allowed_methods

## Complete Production Example

```hcl
# Bucket for application assets with full production CORS setup
resource "aws_s3_bucket" "app_assets" {
  bucket_prefix = "app-assets-"
}

resource "aws_s3_bucket_public_access_block" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.cors_origins
    expose_headers  = ["ETag", "x-amz-version-id"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_versioning" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## Summary

CORS configuration on S3 is essential whenever browsers access your bucket from a different origin. Match your allowed origins precisely (protocol, domain, port), only allow the HTTP methods your application actually uses, and set a reasonable `max_age_seconds` to reduce preflight requests. When using CloudFront, make sure it forwards the `Origin` header so S3 can evaluate CORS rules correctly. And always test with `curl` when debugging - it shows you exactly what headers are being sent and received.

For more S3 configuration, see our guides on [creating S3 static website hosting](https://oneuptime.com/blog/post/2026-02-23-create-s3-static-website-hosting-in-terraform/view) and [configuring S3 bucket policies](https://oneuptime.com/blog/post/2026-02-23-configure-s3-bucket-policies-in-terraform/view).
