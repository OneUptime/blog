# How to Fix Error Creating CloudFront Distribution InvalidOrigin

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudFront, CDN, Troubleshooting

Description: Resolve the InvalidOrigin error when creating CloudFront distributions with Terraform, including S3 origin misconfigurations and custom origin domain issues.

---

The `InvalidOrigin` error when creating a CloudFront distribution means CloudFront cannot connect to or validate the origin you specified. This could be an S3 bucket, an Application Load Balancer, a custom HTTP server, or any other origin type. The error blocks the entire distribution from being created, so you need to fix the origin configuration before anything else will work.

## What the Error Looks Like

```
Error: error creating CloudFront Distribution: InvalidOrigin:
The specified origin server does not exist or is not valid.
    status code: 400, request id: abc123-def456

Error: error creating CloudFront Distribution: InvalidOrigin:
One or more of your origins or origin groups do not exist.
    status code: 400, request id: abc123-def456
```

## Common Causes and Fixes

### 1. Wrong S3 Bucket Domain Name

This is the most common cause. The S3 origin domain must use the regional endpoint format, not the global format:

```hcl
# WRONG - using the global S3 endpoint
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = "my-bucket.s3.amazonaws.com"  # This can cause issues
    origin_id   = "S3Origin"
  }
  # ...
}

# CORRECT - using the regional endpoint from Terraform
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.my_bucket.bucket_regional_domain_name
    origin_id   = "S3Origin"
  }
  # ...
}
```

The `bucket_regional_domain_name` attribute returns the correct regional endpoint (like `my-bucket.s3.us-east-1.amazonaws.com`) which CloudFront can always resolve.

### 2. S3 Bucket Does Not Exist

If the S3 bucket has not been created yet or was deleted, CloudFront cannot validate the origin:

```bash
# Verify the bucket exists
aws s3api head-bucket --bucket my-bucket-name
```

Make sure Terraform creates the S3 bucket before the CloudFront distribution:

```hcl
resource "aws_s3_bucket" "website" {
  bucket = "my-website-bucket"
}

resource "aws_cloudfront_distribution" "cdn" {
  # Implicit dependency through the reference
  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "S3Origin"
  }
  # ...
}
```

### 3. Using Website Endpoint Instead of Bucket Endpoint

If you are using S3 static website hosting, you need to use the website endpoint as a custom origin, not the S3 bucket endpoint:

```hcl
# For S3 website hosting, use a custom origin
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    # Use the website endpoint, not the bucket endpoint
    domain_name = aws_s3_bucket_website_configuration.website.website_endpoint
    origin_id   = "S3WebsiteOrigin"

    # Website endpoints require custom_origin_config, not s3_origin_config
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"  # S3 website endpoints only support HTTP
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3WebsiteOrigin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
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

### 4. Custom Origin Domain Is Not Resolvable

If you are using a custom origin (like an ALB or your own server), the domain name must be publicly resolvable:

```hcl
# WRONG - using a private DNS name or IP
origin {
  domain_name = "10.0.1.50"  # Private IP, not resolvable
  origin_id   = "CustomOrigin"
}

origin {
  domain_name = "internal-my-alb-123.us-east-1.elb.amazonaws.com"
  origin_id   = "ALBOrigin"  # Internal ALB, not accessible from CloudFront
}

# CORRECT - using a public domain
origin {
  domain_name = "api.example.com"
  origin_id   = "CustomOrigin"

  custom_origin_config {
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "https-only"
    origin_ssl_protocols   = ["TLSv1.2"]
  }
}
```

For ALB origins, make sure the ALB is internet-facing, not internal:

```hcl
resource "aws_lb" "web" {
  name               = "web-alb"
  internal           = false  # Must be false for CloudFront
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_lb.web.dns_name
    origin_id   = "ALBOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  # ...
}
```

### 5. Mixing Up s3_origin_config and custom_origin_config

S3 bucket origins and custom origins require different configuration blocks. Using the wrong one causes the error:

```hcl
# For standard S3 bucket access (not website hosting)
origin {
  domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
  origin_id                = "S3Origin"
  origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  # Do NOT add custom_origin_config here
}

# For custom origins (ALB, EC2, external servers, S3 website endpoints)
origin {
  domain_name = "api.example.com"
  origin_id   = "CustomOrigin"

  custom_origin_config {
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "https-only"
    origin_ssl_protocols   = ["TLSv1.2"]
  }
  # Do NOT add s3_origin_config here
}
```

### 6. Origin Access Control or Identity Misconfiguration

If you are using Origin Access Control (OAC) or the older Origin Access Identity (OAI), misconfiguration can cause the error:

```hcl
# Modern approach: Origin Access Control
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "my-oac"
  description                       = "OAC for S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }
  # ...
}

# Bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "allow_cloudfront" {
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
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}
```

### 7. Origin ID Mismatch

The `origin_id` in the origin block must match the `target_origin_id` in the cache behavior:

```hcl
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "myS3Origin"  # This ID
  }

  default_cache_behavior {
    target_origin_id = "myS3Origin"  # Must match exactly
    # ...
  }
  # ...
}
```

## Complete Working Example

```hcl
resource "aws_s3_bucket" "website" {
  bucket = "my-static-website-bucket"
}

resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "website-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
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

## Debugging Tips

1. **Check DNS resolution.** Make sure the origin domain resolves:

```bash
nslookup my-bucket.s3.us-east-1.amazonaws.com
```

2. **Test origin connectivity.** Try to reach the origin directly:

```bash
curl -I https://my-bucket.s3.us-east-1.amazonaws.com
```

3. **Enable CloudFront logging** to get more details about origin connection issues after the distribution is created.

4. **Monitor your CDN** with [OneUptime](https://oneuptime.com) to track origin health, cache hit rates, and error rates across your CloudFront distributions.

## Conclusion

The `InvalidOrigin` error almost always comes from the wrong domain name format, a non-existent origin, or mixing up S3 and custom origin configurations. Use `bucket_regional_domain_name` for S3 origins, make sure custom origins are publicly resolvable, and match your origin config type to your origin type. Using Terraform resource references instead of hardcoded domain names prevents most of these issues.
