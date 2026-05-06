# How to Create CloudFront Functions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudFront, Edge Computing, CDN, Infrastructure as Code

Description: Learn how to create and deploy AWS CloudFront Functions for lightweight edge logic like URL rewrites, header manipulation, and auth checks using OpenTofu.

## Introduction

CloudFront Functions are ultra-lightweight JavaScript functions that run at CloudFront edge locations with sub-millisecond execution time. They are ideal for URL rewrites, header modifications, and simple authentication checks. OpenTofu manages function code, publishing, and association with distributions.

## URL Rewrite Function

```javascript
// functions/url-rewrite.js
// Rewrite clean URLs to add .html extension
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Check if the URI has a file extension
  if (!uri.includes('.')) {
    // Append .html if no extension found
    if (uri.endsWith('/')) {
      request.uri = uri + 'index.html';
    } else {
      request.uri = uri + '.html';
    }
  }

  return request;
}
```

## Security Headers Function

```javascript
// functions/security-headers.js
// Add security headers during viewer-response events
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  headers['strict-transport-security'] = {
    value: 'max-age=63072000; includeSubdomains; preload'
  };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options']        = { value: 'DENY' };
  headers['x-xss-protection']       = { value: '1; mode=block' };
  headers['referrer-policy']        = { value: 'strict-origin-when-cross-origin' };
  headers['content-security-policy']= {
    value: "default-src 'self'; img-src 'self' data:; script-src 'self'"
  };

  return response;
}
```

## Creating Functions with OpenTofu

```hcl
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${var.app_name}-url-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite clean URLs to HTML files"
  publish = true

  code = file("${path.module}/functions/url-rewrite.js")
}

resource "aws_cloudfront_function" "security_headers" {
  name    = "${var.app_name}-security-headers"
  runtime = "cloudfront-js-2.0"
  comment = "Add security headers during viewer-response events"
  publish = true

  code = file("${path.module}/functions/security-headers.js")
}
```

## Associating Functions with a Distribution

```hcl
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "website" {
  enabled         = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id

    # Viewer request function for URL rewriting
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }

    # Viewer response function for security headers
    function_association {
      event_type   = "viewer-response"
      function_arn = aws_cloudfront_function.security_headers.arn
    }
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

CloudFront Functions provide sub-millisecond edge logic for URL rewriting, header injection, and simple request manipulation. OpenTofu manages function code, publishing, and distribution associations - keeping your edge logic version controlled and consistently deployed.
