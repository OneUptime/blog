# How to Create Alibaba Cloud OSS Buckets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Alibaba Cloud, OSS, Object Storage, Infrastructure as Code

Description: Learn how to create Alibaba Cloud OSS (Object Storage Service) buckets with OpenTofu, including ACL, lifecycle rules, and versioning.

Alibaba Cloud OSS is a highly scalable object storage service. OpenTofu lets you create OSS buckets, configure access control, enable versioning, and set lifecycle rules as code.

## Creating a Basic Bucket

```hcl
resource "alicloud_oss_bucket" "data" {
  bucket = "myapp-data-${var.region}"  # Bucket name must be globally unique
  acl    = "private"

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "bucket_domain_name" {
  value = alicloud_oss_bucket.data.extranet_endpoint
}
```

## Creating a Public Read Bucket for Static Assets

```hcl
resource "alicloud_oss_bucket" "static" {
  bucket = "myapp-static-${var.region}"
  acl    = "public-read"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["https://example.com"]
    max_age_seconds = 3600
  }

  website {
    index_document = "index.html"
    error_document = "404.html"
  }
}
```

## Enabling Versioning

```hcl
resource "alicloud_oss_bucket" "versioned" {
  bucket = "myapp-versioned"
  acl    = "private"

  versioning {
    status = "Enabled"  # Enabled or Suspended
  }
}
```

## Adding Lifecycle Rules

```hcl
resource "alicloud_oss_bucket" "with_lifecycle" {
  bucket = "myapp-logs"
  acl    = "private"

  lifecycle_rule {
    id      = "archive-old-logs"
    prefix  = "logs/"
    enabled = true

    # Move to IA storage after 30 days
    transitions {
      days          = 30
      storage_class = "IA"
    }

    # Move to Archive after 90 days
    transitions {
      days          = 90
      storage_class = "Archive"
    }

    # Delete after 365 days
    expiration {
      days = 365
    }
  }
}
```

## Server-Side Encryption

```hcl
resource "alicloud_oss_bucket" "encrypted" {
  bucket = "myapp-encrypted"
  acl    = "private"

  server_side_encryption_rule {
    sse_algorithm     = "KMS"  # AES256 or KMS
    kms_master_key_id = var.kms_key_id  # Leave empty to use OSS-managed key
  }
}
```

## Cross-Region Replication

```hcl
resource "alicloud_oss_bucket_replication" "dr" {
  bucket                        = alicloud_oss_bucket.data.bucket
  action                        = "ALL"  # ALL, PUT, DELETE, or ABORT
  historical_object_replication = "enabled"

  destination {
    bucket   = alicloud_oss_bucket.dr.bucket
    location = "oss-cn-shanghai"
  }

  source_selection_criteria {
    sse_kms_encrypted_objects {
      status = "Disabled"
    }
  }
}
```

## Conclusion

Alibaba Cloud OSS buckets in OpenTofu are created with `alicloud_oss_bucket`. Use `acl = "private"` for application data and `public-read` for static website assets. Enable versioning for critical data, add lifecycle rules to transition to IA or Archive storage for cost savings, and use server-side encryption with KMS for compliance requirements. Bucket names must be globally unique across all Alibaba Cloud accounts.
