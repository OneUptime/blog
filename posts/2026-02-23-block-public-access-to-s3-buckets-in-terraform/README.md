# How to Block Public Access to S3 Buckets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, S3, Security, Public Access

Description: Learn how to block public access to S3 buckets in Terraform using bucket-level and account-level settings, with practical examples and security best practices.

---

S3 bucket data breaches make headlines regularly, and nearly all of them come down to one thing: buckets accidentally left open to the public. AWS introduced S3 Block Public Access specifically to prevent this. It adds guardrails that override any bucket policy or ACL that would make your data public.

If you take one thing from this post: enable all four Block Public Access settings on every bucket, and enable them at the account level too. Here's how to do it properly in Terraform.

## Understanding the Four Settings

Block Public Access has four independent settings. Each addresses a different way a bucket can be made public:

1. **BlockPublicAcls** - Rejects PUT requests that include public ACLs. Prevents new objects from being uploaded with public access.

2. **IgnorePublicAcls** - Ignores all public ACLs on the bucket and its objects. Even if public ACLs exist, they're treated as if they don't.

3. **BlockPublicPolicy** - Rejects bucket policy changes that would grant public access. Prevents someone from attaching a wildcard policy.

4. **RestrictPublicBuckets** - Restricts access to buckets with public policies. Even if a public policy exists, only AWS services and authorized users can access the bucket.

For maximum security, enable all four.

## Bucket-Level Block Public Access

```hcl
# Create an S3 bucket
resource "aws_s3_bucket" "data" {
  bucket_prefix = "app-data-"

  tags = {
    Name = "app-data"
  }
}

# Block all public access to this bucket
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

This is the bare minimum every bucket should have. Let's see what each setting actually prevents.

## What Each Setting Blocks

```hcl
# If block_public_acls = true, this upload would be REJECTED:
# aws s3api put-object --bucket my-bucket --key file.txt \
#   --body file.txt --acl public-read

# If ignore_public_acls = true, even if objects have public ACLs,
# public access is still blocked

# If block_public_policy = true, this policy would be REJECTED:
# {
#   "Effect": "Allow",
#   "Principal": "*",
#   "Action": "s3:GetObject",
#   "Resource": "arn:aws:s3:::my-bucket/*"
# }

# If restrict_public_buckets = true, even with a public policy,
# access is limited to authorized AWS principals only
```

## Account-Level Block Public Access

The account-level setting is the nuclear option - it applies to all buckets in the account, including future ones. Even if someone creates a bucket and forgets to set bucket-level blocking, the account setting catches it.

```hcl
# Block public access for the entire AWS account
resource "aws_s3_account_public_access_block" "account" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

This is the single most impactful security setting you can apply. It prevents any bucket in the account from being publicly accessible, regardless of individual bucket settings.

## Combining Account and Bucket Level

The strictest setting wins. If the account blocks public access, it doesn't matter what the bucket settings say.

```hcl
# Account-level: block everything
resource "aws_s3_account_public_access_block" "account" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Even though this bucket has relaxed settings, the account-level
# settings override them - public access is still blocked
resource "aws_s3_bucket_public_access_block" "this_does_nothing" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = false  # Overridden by account setting
  block_public_policy     = false  # Overridden by account setting
  ignore_public_acls      = false  # Overridden by account setting
  restrict_public_buckets = false  # Overridden by account setting
}
```

## Exception: Public Buckets for Static Websites

Sometimes you legitimately need a public bucket, like for static website hosting. In that case, use a separate AWS account dedicated to public content, and only relax the settings where necessary.

```hcl
# For a dedicated "public content" account
# Account level: allow public policies (needed for static websites)
resource "aws_s3_account_public_access_block" "public_content_account" {
  block_public_acls       = true   # Still block ACL-based public access
  block_public_policy     = false  # Allow public bucket policies
  ignore_public_acls      = true   # Ignore any public ACLs
  restrict_public_buckets = false  # Allow public bucket policies to work
}

# Static website bucket
resource "aws_s3_bucket" "website" {
  bucket = "www.example.com"
}

# Allow public reads via bucket policy (only works because
# block_public_policy is false at the account level)
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = false  # Need public policy for static website
  ignore_public_acls      = true
  restrict_public_buckets = false  # Allow public reads
}

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
```

A better approach for static websites is to use CloudFront with Origin Access Control, keeping the bucket private.

```hcl
# Better: Keep the bucket private and use CloudFront
resource "aws_s3_bucket" "website_private" {
  bucket_prefix = "website-"
}

# Full public access block - the bucket stays private
resource "aws_s3_bucket_public_access_block" "website_private" {
  bucket = aws_s3_bucket.website_private.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront serves the content publicly while S3 stays private
resource "aws_cloudfront_distribution" "website" {
  origin {
    domain_name              = aws_s3_bucket.website_private.bucket_regional_domain_name
    origin_id                = "s3-website"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-website"
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

resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "website-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

## Applying to All Buckets with a Module

Create a module that always includes public access blocking.

```hcl
# modules/secure-bucket/main.tf
resource "aws_s3_bucket" "this" {
  bucket_prefix = "${var.name}-"

  tags = var.tags
}

# Always block public access
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Always enable encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

output "bucket_id" {
  value = aws_s3_bucket.this.id
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}
```

Usage:

```hcl
module "logs_bucket" {
  source = "./modules/secure-bucket"
  name   = "application-logs"
  tags   = { Environment = "production" }
}

module "data_bucket" {
  source = "./modules/secure-bucket"
  name   = "application-data"
  tags   = { Environment = "production" }
}
```

## Detecting Public Buckets

Use AWS Config or S3 Storage Lens to audit your buckets.

```hcl
# AWS Config rule to detect public buckets
resource "aws_config_config_rule" "s3_public_read" {
  name = "s3-bucket-public-read-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }
}

resource "aws_config_config_rule" "s3_public_write" {
  name = "s3-bucket-public-write-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_WRITE_PROHIBITED"
  }
}
```

You can also check from the CLI:

```bash
# Check public access block settings for a bucket
aws s3api get-public-access-block --bucket my-bucket

# Check account-level settings
aws s3control get-public-access-block --account-id 123456789012

# List all public buckets (requires Access Analyzer)
aws accessanalyzer list-findings --analyzer-arn arn:aws:access-analyzer:us-east-1:123456789012:analyzer/MyAnalyzer \
  --filter '{"resourceType": {"eq": ["AWS::S3::Bucket"]}}'
```

## Ordering Matters with Terraform

When applying a bucket policy alongside public access blocking, the order matters.

```hcl
# Apply public access block first
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Then apply the bucket policy
# If block_public_policy is true, any policy that grants public access
# will be rejected at apply time
resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id
  policy = data.aws_iam_policy_document.data_policy.json

  # Ensure public access block is applied first
  depends_on = [aws_s3_bucket_public_access_block.data]
}
```

## Summary

Blocking public access is the single most important S3 security configuration. Enable all four settings at both the account level and the bucket level. Use the account-level setting as a safety net that catches every bucket. For the rare cases where you need public access (static websites), prefer CloudFront with a private bucket. And use AWS Config rules to continuously audit for any buckets that might have slipped through.

For more S3 security, see our guides on [configuring S3 bucket policies](https://oneuptime.com/blog/post/2026-02-23-configure-s3-bucket-policies-in-terraform/view) and [configuring S3 bucket encryption](https://oneuptime.com/blog/post/2026-02-23-configure-s3-bucket-encryption-in-terraform/view).
