# How to Set Up Cloudflare R2 Storage with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloudflare, R2, Object Storage, Infrastructure as Code, CDN, Storage

Description: Learn how to create and configure Cloudflare R2 storage buckets using OpenTofu for zero-egress-cost object storage integrated with Cloudflare's global network.

---

Cloudflare R2 is S3-compatible object storage with no egress fees, making it ideal for serving large files globally. Cloudflare's provider for OpenTofu lets you manage R2 buckets, CORS rules, lifecycle rules, and custom domain bindings as reproducible infrastructure code.

## Provider Configuration

```hcl
# main.tf

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.19"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

## Creating an R2 Bucket

```hcl
# bucket.tf
# Create an R2 bucket for media storage
resource "cloudflare_r2_bucket" "media" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-media-${var.environment}"
  location   = "wnam"  # Western North America - apac, eeur, enam, weur, wnam, oc

  lifecycle {
    # Prevent accidental bucket deletion
    prevent_destroy = true
  }
}

# Create a bucket for static site assets
resource "cloudflare_r2_bucket" "static" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-static-${var.environment}"
  location   = "wnam"
}
```

## Setting Up a Custom Domain with R2

```hcl
# custom_domain.tf
# Bind the R2 bucket directly to a custom domain
resource "cloudflare_r2_custom_domain" "media" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.media.name
  domain      = "media.${var.domain_name}"
  zone_id     = var.cloudflare_zone_id
  enabled     = true
}
```

## Creating API Tokens for Application Access

```hcl
# api_tokens.tf
# Look up the permission group for bucket-scoped object read/write access
data "cloudflare_account_api_token_permission_groups_list" "r2_bucket_item_write" {
  account_id = var.cloudflare_account_id
  name       = "Workers%20R2%20Storage%20Bucket%20Item%20Write"
  scope      = "com.cloudflare.edge.r2.bucket"
}

# Create an account token scoped to object operations on the media bucket
resource "cloudflare_account_token" "r2_access" {
  account_id = var.cloudflare_account_id
  name       = "r2-application-token"

  policies = [{
    effect = "allow"
    permission_groups = [
      { id = data.cloudflare_account_api_token_permission_groups_list.r2_bucket_item_write.result[0].id },
    ]

    resources = {
      "com.cloudflare.edge.r2.bucket.${var.cloudflare_account_id}_default_${cloudflare_r2_bucket.media.name}" = "*"
    }
  }]
}

# For S3-compatible clients, use the token ID as the Access Key ID
# and the SHA-256 hash of the token value as the Secret Access Key.
output "r2_access_key_id" {
  value = cloudflare_account_token.r2_access.id
}

output "r2_secret_access_key" {
  value     = sha256(cloudflare_account_token.r2_access.value)
  sensitive = true
}
```

## Best Practices

- Use `cloudflare_r2_custom_domain` for straightforward public bucket access on your domain. Use Workers when you need authentication, URL rewriting, custom headers, or other request logic in front of R2.
- Set `Cache-Control: immutable` metadata on content-addressed (hash-named) objects to maximize CDN caching.
- Use location hints when creating buckets to place storage closer to your primary user base.
- Create bucket-scoped API tokens for each application rather than using a broad account-level token.
- Use lifecycle rules to transition or expire objects you no longer need, and monitor bucket growth to control storage costs.
