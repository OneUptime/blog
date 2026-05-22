# How to Use the filemd5 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Filemd5 Function, File System, HCL, Infrastructure as Code, Hashing, MD5

Description: Learn how to use the filemd5 function in Terraform to compute MD5 hashes of local files for S3 ETags, change detection, and content verification.

---

The `filemd5` function computes the MD5 hash of a file's contents and returns it as a hexadecimal string. While MD5 is not suitable for security purposes, it is still widely used in cloud infrastructure for change detection and content verification - including S3 ETags for objects where S3 represents the ETag as an MD5 digest.

## What Is the filemd5 Function?

The `filemd5` function reads a file and returns its MD5 hash as a hex string:

```hcl
# filemd5(path)

# Returns the hex-encoded MD5 hash of a file
filemd5("${path.module}/configs/app.yaml")
# Returns something like: "d41d8cd98f00b204e9800998ecf8427e"
```

The returned string is always 32 hexadecimal characters long.

## S3 ETags - The Primary Use Case

The main reason you will use `filemd5` is for S3 object ETags. For plaintext objects or objects encrypted with SSE-S3 and uploaded without multipart upload, Amazon S3 uses an MD5 digest as the ETag, and Terraform uses the `etag` attribute to detect when an object needs to be re-uploaded:

```hcl
resource "aws_s3_object" "app_config" {
  bucket = aws_s3_bucket.config.id
  key    = "configs/app.yaml"
  source = "${path.module}/configs/app.yaml"

  # etag triggers an update when the file content changes
  etag = filemd5("${path.module}/configs/app.yaml")
}
```

Without the `etag`, Terraform would look at the key, bucket, and source path - and if those have not changed, it would skip the upload even if the file's contents are different.

If the object uses SSE-KMS or another case where the S3 ETag is not an MD5 digest, use the `source_hash` argument instead. Terraform stores `source_hash` in state and uses it to trigger updates without depending on S3's ETag format.

## Uploading Multiple Files with Change Detection

A common pattern is uploading a directory of files to S3 with proper change detection:

```hcl
locals {
  website_files = fileset("${path.module}/website", "**/*")

  content_types = {
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".txt"  = "text/plain"
    ".xml"  = "application/xml"
  }
}

resource "aws_s3_object" "website" {
  for_each = local.website_files

  bucket = aws_s3_bucket.website.id
  key    = each.value
  source = "${path.module}/website/${each.value}"

  # MD5 hash for change detection
  etag = filemd5("${path.module}/website/${each.value}")

  # Set content type based on file extension
  content_type = lookup(
    local.content_types,
    try(regex("\\.[^.]+$", each.value), ""),
    "application/octet-stream"
  )

  cache_control = "max-age=3600"
}
```

When any file's content changes, only that specific S3 object will be re-uploaded.

## Comparing filemd5 with Other Hash Functions

Terraform has several file hashing functions. Here is when each one is appropriate:

```hcl
locals {
  path = "${path.module}/example.txt"

  # filemd5 - hex MD5 (32 chars)
  # Best for: S3 ETags, quick content comparison
  md5_hash = filemd5(local.path)
  # Example: "098f6bcd4621d373cade4e832627b4f6"

  # filesha1 - hex SHA-1 (40 chars)
  # Best for: git-style content addressing, legacy systems
  sha1_hash = filesha1(local.path)
  # Example: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3"

  # filesha256 - hex SHA-256 (64 chars)
  # Best for: security-sensitive integrity checks
  sha256_hash = filesha256(local.path)
  # Example: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"

  # filebase64sha256 - base64 SHA-256 (44 chars)
  # Best for: Lambda source_code_hash
  b64sha256_hash = filebase64sha256(local.path)
  # Example: "n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg="
}
```

## Configuration File Management

Track changes across multiple configuration files:

```hcl
locals {
  config_files = {
    "app.yaml"      = "${path.module}/configs/app.yaml"
    "database.yaml" = "${path.module}/configs/database.yaml"
    "redis.yaml"    = "${path.module}/configs/redis.yaml"
    "nginx.conf"    = "${path.module}/configs/nginx.conf"
  }

  # Compute hashes for all config files
  config_hashes = {
    for name, path in local.config_files :
    name => filemd5(path)
  }

  # Create a combined hash to detect any config change
  all_configs_hash = md5(join(",", values(local.config_hashes)))
}

# Upload each config file with change detection
resource "aws_s3_object" "configs" {
  for_each = local.config_files

  bucket = aws_s3_bucket.config.id
  key    = "configs/${each.key}"
  source = each.value
  etag   = local.config_hashes[each.key]
}

output "config_hashes" {
  value = local.config_hashes
}
```

## Triggering Deployments on Config Change

Use MD5 hashes to force resource recreation when files change:

```hcl
locals {
  # Hash of the deployment configuration
  deploy_config_hash = filemd5("${path.module}/deploy/config.yaml")
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  network_mode             = "awsvpc"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${var.ecr_repo}:${var.image_tag}"
      environment = [
        {
          name  = "CONFIG_VERSION"
          # This changes when the config file changes,
          # triggering a new task definition revision
          value = local.deploy_config_hash
        }
      ]
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

## Static Website Deployment

A complete static website deployment with proper caching and change detection:

```hcl
locals {
  site_dir = "${path.module}/site"
  files    = fileset(local.site_dir, "**/*")

  # Cacheable file extensions get long TTLs
  cacheable_extensions = [".js", ".css", ".png", ".jpg", ".gif", ".svg", ".woff", ".woff2"]

  content_types = {
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".txt"  = "text/plain"
    ".xml"   = "application/xml"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
  }
}

resource "aws_s3_object" "site_files" {
  for_each = local.files

  bucket       = aws_s3_bucket.site.id
  key          = each.value
  source       = "${local.site_dir}/${each.value}"
  etag         = filemd5("${local.site_dir}/${each.value}")
  content_type = lookup(local.content_types, try(regex("\\.[^.]+$", each.value), ""), "application/octet-stream")

  # Long cache for static assets, short cache for HTML
  cache_control = anytrue([
    for ext in local.cacheable_extensions :
    endswith(each.value, ext)
  ]) ? "max-age=31536000, immutable" : "max-age=300, must-revalidate"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# Track site changes in the CloudFront distribution comment
resource "aws_cloudfront_distribution" "site" {
  # Use a hash of all file hashes to detect any change
  # Create a separate CloudFront invalidation outside Terraform when needed
  comment = "Site hash: ${md5(join(",", [for f in local.files : filemd5("${local.site_dir}/${f}")]))}"

  # ... distribution configuration
  enabled = true
  origin {
    domain_name = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id   = "s3-site"

    s3_origin_config {
      origin_access_identity = ""
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
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

## Terraform Backend Configuration Artifacts

Verify that backend configuration files have not been tampered with:

```hcl
locals {
  backend_config_hash = filemd5("${path.module}/backend.hcl")
}

output "backend_hash" {
  value       = local.backend_config_hash
  description = "MD5 hash of backend configuration for change tracking"
}
```

## Comparing Content Versions

Check if two files have the same content:

```hcl
locals {
  dev_config_hash    = filemd5("${path.module}/configs/dev.yaml")
  staging_config_hash = filemd5("${path.module}/configs/staging.yaml")

  configs_match = local.dev_config_hash == local.staging_config_hash
}

output "config_comparison" {
  value = local.configs_match ? "Dev and staging configs are identical" : "Dev and staging configs differ"
}
```

## Important Notes

```hcl
# MD5 is NOT cryptographically secure
# Do NOT use it for security purposes (password hashing, signatures, etc.)
# It is fine for content change detection and ETags

# filemd5 reads the file at plan time
# The file must exist when you run terraform plan

# filemd5 handles both text and binary files correctly

# The returned hash is always lowercase hexadecimal
# 32 characters long (128-bit hash)

# Two different files with identical content produce the same hash
# This is by design and useful for deduplication
```

## Summary

The `filemd5` function computes an MD5 hash of a file's contents and is primarily used for S3 object ETags where the S3 ETag is an MD5 digest. When you set the `etag` attribute on an `aws_s3_object` to `filemd5(source_path)`, Terraform can detect when a file's contents change and re-upload it accordingly. Use `source_hash` instead when S3 ETags are not MD5 digests, such as with SSE-KMS or multipart-uploaded objects. While MD5 is not suitable for security-sensitive operations, it is perfectly fine for change detection and content comparison. For stronger file integrity checks, use `filesha256` or `filebase64sha256` instead.

For related functions, see our posts on the [filesha256 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filesha256-function-in-terraform/view) and the [filebase64sha256 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filebase64sha256-function-in-terraform/view).
