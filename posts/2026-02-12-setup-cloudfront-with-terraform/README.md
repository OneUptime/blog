# How to Set Up CloudFront with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, Terraform, CDN, Infrastructure as Code

Description: Learn how to set up an AWS CloudFront distribution using Terraform, including S3 origins, caching behaviors, and SSL certificates.

---

If you've ever clicked through the AWS Console to set up a CloudFront distribution, you know it's a long list of options and checkboxes. That's fine for a one-off project, but when you're managing multiple environments or need repeatable deployments, Terraform is the way to go. In this post, we'll walk through creating a CloudFront distribution backed by an S3 bucket using Terraform from scratch.

## Why Terraform for CloudFront?

CloudFront distributions have a lot of moving parts - origins, cache behaviors, SSL certificates, custom error pages, and more. Defining all of this in Terraform gives you version control, peer review through pull requests, and the ability to spin up identical distributions across staging and production. You also get the benefit of destroying everything cleanly when you no longer need it.

## Prerequisites

Before we start, make sure you have:

- Terraform v1.0+ installed
- AWS CLI configured with appropriate credentials
- A domain name (optional, but recommended for production)
- An S3 bucket you want to serve content from (or we'll create one)

## Setting Up the Provider

First, let's configure the AWS provider. CloudFront is a global service, but the ACM certificate for it must be in us-east-1.

This provider block configures the default region and an alias for us-east-1, which we'll need for the SSL certificate.

```hcl
# main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# We need a separate provider for ACM certificates
# CloudFront requires certificates in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
```

## Creating the S3 Bucket

Next, we'll create an S3 bucket to act as the origin for CloudFront. The bucket itself should not be publicly accessible - CloudFront will use an Origin Access Control (OAC) to fetch objects.

This creates a private S3 bucket that only CloudFront can access through the OAC policy.

```hcl
# s3.tf
resource "aws_s3_bucket" "website" {
  bucket = "my-cloudfront-website-bucket"
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Upload a simple index.html for testing
resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.website.id
  key          = "index.html"
  content      = "<html><body><h1>Hello from CloudFront!</h1></body></html>"
  content_type = "text/html"
}
```

## Setting Up Origin Access Control

Origin Access Control (OAC) replaced the older Origin Access Identity (OAI). It's more secure and supports additional features like SSE-KMS.

This OAC configuration tells CloudFront to sign requests when fetching from S3.

```hcl
# cloudfront.tf
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "website-oac"
  description                       = "OAC for website S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

## Creating the CloudFront Distribution

Now for the main event. This is where we define caching behaviors, the default root object, and how CloudFront talks to S3.

This distribution serves content from S3 with a 24-hour default cache TTL and redirects HTTP to HTTPS.

```hcl
resource "aws_cloudfront_distribution" "website" {
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-website"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "CloudFront distribution for website"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-website"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  # Custom error response for SPAs
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

## Adding the S3 Bucket Policy

CloudFront needs permission to read from the S3 bucket. We do this with a bucket policy that references the distribution.

This policy grants the CloudFront distribution read access to all objects in the bucket.

```hcl
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

## Adding a Custom Domain with ACM

If you want to use your own domain instead of the default `d1234.cloudfront.net` URL, you'll need an ACM certificate.

This creates an ACM certificate and validates it via DNS.

```hcl
# acm.tf
resource "aws_acm_certificate" "website" {
  provider          = aws.us_east_1
  domain_name       = "www.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# You'll need to add the DNS validation records to your domain
output "certificate_validation_records" {
  value = aws_acm_certificate.website.domain_validation_options
}
```

Once the certificate is validated, update the CloudFront distribution to use it.

Replace the `viewer_certificate` block in the distribution with this to use your custom domain and ACM cert.

```hcl
# Update the viewer_certificate block in the distribution
viewer_certificate {
  acm_certificate_arn      = aws_acm_certificate.website.arn
  ssl_support_method       = "sni-only"
  minimum_protocol_version = "TLSv1.2_2021"
}

# And add aliases
aliases = ["www.example.com"]
```

## Using Cache Policies Instead of Forwarded Values

AWS recommends using managed cache policies instead of the legacy `forwarded_values` block. Here's how to use them.

This version uses AWS managed cache policies for cleaner configuration and better performance.

```hcl
default_cache_behavior {
  allowed_methods  = ["GET", "HEAD", "OPTIONS"]
  cached_methods   = ["GET", "HEAD"]
  target_origin_id = "S3-website"

  # Use managed cache policy - CachingOptimized
  cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

  viewer_protocol_policy = "redirect-to-https"
  compress               = true
}
```

## Useful Outputs

Add these outputs so you can easily find your distribution's URL and ID after deployment.

```hcl
# outputs.tf
output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.website.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.website.domain_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.website.id
}
```

## Deploying

Run the standard Terraform workflow to create everything.

```bash
# Initialize Terraform
terraform init

# Preview what will be created
terraform plan

# Apply the configuration
terraform apply
```

CloudFront distributions take about 5-15 minutes to deploy globally. Be patient - the `terraform apply` will wait for it to finish.

## Invalidating the Cache

When you update content in S3, CloudFront won't pick up changes until the cache expires. You can force an invalidation.

```bash
# Invalidate everything
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Common Gotchas

There are a few things that trip people up when working with CloudFront and Terraform:

1. **ACM certificates must be in us-east-1** for CloudFront, regardless of where your other resources live.
2. **OAI vs OAC** - AWS recommends OAC for new distributions. If you're following older tutorials, they might use OAI.
3. **Distribution updates are slow** - Any change to a CloudFront distribution triggers a global deployment that takes several minutes.
4. **Don't forget compression** - Setting `compress = true` in your cache behavior enables automatic gzip/br compression, which significantly reduces transfer sizes.

## Monitoring Your Distribution

Once your CloudFront distribution is live, you'll want to monitor its performance and error rates. Tools like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alerting/view) can help you set up comprehensive monitoring for your entire AWS infrastructure, including CloudFront distributions.

## Wrapping Up

Setting up CloudFront with Terraform isn't complicated once you understand the pieces. The main components are the S3 origin, the OAC for secure access, the distribution itself with its cache behaviors, and optionally an ACM certificate for a custom domain. With everything defined in code, you can replicate this setup across environments in minutes and track every change through version control.
