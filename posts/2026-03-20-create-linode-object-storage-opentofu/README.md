# How to Create Linode Object Storage with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Linode, Object Storage, S3-Compatible, Infrastructure as Code

Description: Learn how to create and configure Linode Object Storage buckets with OpenTofu for scalable, S3-compatible file storage.

Linode Object Storage is an S3-compatible storage service. The `linode/linode` provider lets you create buckets, generate access keys, and manage bucket lifecycle policies with OpenTofu.

## Creating an Object Storage Bucket

```hcl
resource "linode_object_storage_bucket" "assets" {
  cluster = "us-east-1"     # Storage cluster/region
  label   = "myapp-assets"

  # Apply a lifecycle rule to expire old objects
  lifecycle_rule {
    id      = "expire-old-logs"
    enabled = true

    expiration {
      days = 90  # Delete objects older than 90 days
    }
  }
}

output "bucket_endpoint" {
  value = "https://${linode_object_storage_bucket.assets.cluster}.linodeobjects.com/${linode_object_storage_bucket.assets.label}"
}
```

## Creating Access Keys

```hcl
resource "linode_object_storage_key" "app" {
  label = "myapp-access-key"

  # Restrict access to a specific bucket
  bucket_access {
    bucket_name = linode_object_storage_bucket.assets.label
    cluster     = linode_object_storage_bucket.assets.cluster
    permissions = "read_write"  # read_only, read_write
  }
}

output "access_key_id" {
  value     = linode_object_storage_key.app.access_key
  sensitive = true
}

output "secret_access_key" {
  value     = linode_object_storage_key.app.secret_key
  sensitive = true
}
```

## Using the Bucket with the S3 Provider

Since Linode Object Storage is S3-compatible, you can manage bucket contents with the AWS S3 provider:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  # Use Linode Object Storage as the S3 endpoint
  region                      = "us-east-1"
  access_key                  = linode_object_storage_key.app.access_key
  secret_key                  = linode_object_storage_key.app.secret_key
  skip_credentials_validation = true
  skip_requesting_account_id = true

  endpoints {
    s3 = "https://us-east-1.linodeobjects.com"
  }
}

resource "aws_s3_object" "index" {
  bucket       = linode_object_storage_bucket.assets.label
  key          = "index.html"
  source       = "dist/index.html"
  content_type = "text/html"
}
```

## Creating Multiple Buckets

```hcl
variable "buckets" {
  type    = set(string)
  default = ["assets", "backups", "uploads"]
}

resource "linode_object_storage_bucket" "app" {
  for_each = var.buckets
  cluster  = "us-east-1"
  label    = "myapp-${each.key}"
}
```

## Conclusion

Linode Object Storage provides cost-effective S3-compatible storage. Use the `linode` provider to create buckets and access keys with permission scoping, and use the `aws` provider with a custom endpoint to manage bucket contents and lifecycle rules using the familiar S3 API. Store access keys as sensitive outputs and inject them into applications via environment variables or secrets managers.
