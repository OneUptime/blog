# How to Create DigitalOcean Spaces (Object Storage) with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DigitalOcean, Space, Object Storage, Infrastructure as Code

Description: Learn how to create and configure DigitalOcean Spaces object storage buckets with OpenTofu, including CDN and access control settings.

DigitalOcean Spaces is S3-compatible object storage. OpenTofu's DigitalOcean provider lets you create Spaces buckets, configure access policies, enable CDN, and manage CORS rules as code.

## Provider Configuration

Spaces uses its own endpoint and credentials (Spaces Access Key, not the DO API token):

```hcl
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token             = var.do_token
  spaces_access_id  = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
}

variable "spaces_access_id"  { type = string; sensitive = true }
variable "spaces_secret_key" { type = string; sensitive = true }
```

## Creating a Spaces Bucket

```hcl
resource "digitalocean_spaces_bucket" "assets" {
  name   = "myapp-assets"
  region = "nyc3"
  acl    = "private"  # Options: private, public-read
}

output "bucket_domain_name" {
  value = digitalocean_spaces_bucket.assets.bucket_domain_name
}
```

## Enabling Public Access for Static Assets

```hcl
resource "digitalocean_spaces_bucket" "public" {
  name   = "myapp-public-assets"
  region = "nyc3"
  acl    = "public-read"

  # Allow public read access to all objects
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://example.com"]
    max_age_seconds = 3600
  }
}
```

## Enabling CDN

```hcl
resource "digitalocean_cdn" "assets" {
  origin = digitalocean_spaces_bucket.public.bucket_domain_name

  # Custom subdomain (requires a DO-managed domain)
  custom_domain = "cdn.example.com"
  certificate_name = digitalocean_certificate.cdn.name

  # Cache TTL in seconds (default: 3600)
  ttl = 86400
}
```

## Uploading Objects

```hcl
resource "digitalocean_spaces_bucket_object" "index" {
  region       = digitalocean_spaces_bucket.public.region
  bucket       = digitalocean_spaces_bucket.public.name
  key          = "index.html"
  source       = "dist/index.html"
  content_type = "text/html"
  acl          = "public-read"

  # Invalidate CDN cache when the file changes
  etag = filemd5("dist/index.html")
}
```

## Bucket Policy for Cross-Account Access

```hcl
resource "digitalocean_spaces_bucket_policy" "cross_account" {
  region = digitalocean_spaces_bucket.assets.region
  bucket = digitalocean_spaces_bucket.assets.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCIAccess"
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::ACCOUNT_ID:root" }
      Action    = ["s3:GetObject", "s3:PutObject"]
      Resource  = ["arn:aws:s3:::${digitalocean_spaces_bucket.assets.name}/*"]
    }]
  })
}
```

## Conclusion

DigitalOcean Spaces provides S3-compatible object storage that integrates naturally with OpenTofu. Create private buckets for application data, public buckets with CORS rules for static assets, and enable the CDN for global content delivery. Use the Spaces-specific access keys separate from your DigitalOcean API token.
