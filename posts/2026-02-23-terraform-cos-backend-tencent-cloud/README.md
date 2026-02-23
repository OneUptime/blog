# How to Configure COS Backend for Terraform State (Tencent Cloud)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Tencent Cloud, COS, State Management, Infrastructure as Code

Description: Complete guide to configuring Tencent Cloud Object Storage (COS) as a backend for Terraform state, including bucket setup, authentication, encryption, and locking.

---

Tencent Cloud Object Storage (COS) is Tencent Cloud's equivalent of AWS S3 or Azure Blob Storage, and it has a native Terraform backend. If you are building infrastructure on Tencent Cloud, COS is the natural place to store your Terraform state. It supports state locking, server-side encryption, and integrates with Tencent Cloud's IAM system. This guide covers everything you need to set it up.

## Prerequisites

Before getting started, you need:

- A Tencent Cloud account
- Tencent Cloud CLI or console access
- A SecretId and SecretKey (API credentials)
- Terraform installed

## Creating the COS Bucket

First, create a bucket for your state files. You can do this through the Tencent Cloud console or with the CLI:

```bash
# Using Tencent Cloud CLI (tccli)
# Create a bucket in the ap-guangzhou region
tccli cos CreateBucket \
  --Bucket "terraform-state-1234567890" \
  --Region "ap-guangzhou"
```

Or create it through the console. The bucket name in COS follows the format `<bucket-name>-<appid>`. Note down your APPID and the full bucket name.

You can also create the bucket using Terraform itself (though you will need local state for this initial bootstrap):

```hcl
# bootstrap/main.tf
# Create the COS bucket for Terraform state storage

provider "tencentcloud" {
  region = "ap-guangzhou"
}

resource "tencentcloud_cos_bucket" "terraform_state" {
  bucket = "terraform-state-${var.appid}"
  acl    = "private"

  # Enable versioning for state recovery
  versioning_enable = true

  # Encrypt all objects by default
  encryption_algorithm = "AES256"
}

variable "appid" {
  description = "Your Tencent Cloud APPID"
  type        = string
}

output "bucket_name" {
  value = tencentcloud_cos_bucket.terraform_state.bucket
}
```

## Basic Backend Configuration

Here is the minimal COS backend configuration:

```hcl
# backend.tf
terraform {
  backend "cos" {
    # The region where your COS bucket is located
    region = "ap-guangzhou"

    # The full bucket name including APPID
    bucket = "terraform-state-1234567890"

    # The key (path) for the state file within the bucket
    prefix = "terraform/state"
  }
}
```

The state file will be stored at `terraform/state/terraform.tfstate` in your bucket.

Initialize the backend:

```bash
# Initialize the COS backend
terraform init

# Verify it's working
terraform state list
```

## Authentication

The COS backend needs Tencent Cloud credentials. There are several ways to provide them.

### Environment Variables

The recommended approach is to use environment variables:

```bash
# Set Tencent Cloud credentials
export TENCENTCLOUD_SECRET_ID="your-secret-id"
export TENCENTCLOUD_SECRET_KEY="your-secret-key"

# Optional: set the region
export TENCENTCLOUD_REGION="ap-guangzhou"

# Initialize Terraform
terraform init
```

### Direct Configuration

You can specify credentials in the backend block (not recommended for production):

```hcl
terraform {
  backend "cos" {
    region    = "ap-guangzhou"
    bucket    = "terraform-state-1234567890"
    prefix    = "terraform/state"

    # Direct credentials (use environment variables instead)
    secret_id  = "your-secret-id"
    secret_key = "your-secret-key"
  }
}
```

### Assume Role

For cross-account access or temporary credentials:

```hcl
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "terraform-state-1234567890"
    prefix = "terraform/state"

    # Assume role for cross-account access
    assume_role {
      role_arn         = "qcs::cam::uin/100000000001:roleName/terraform-state-role"
      session_name     = "terraform"
      session_duration = 3600
    }
  }
}
```

## State Locking

The COS backend does not have built-in state locking like some other backends. However, you can achieve locking by combining COS with a Tencent Cloud database or by using a tag-based mechanism.

For environments where concurrent access is a concern, consider implementing an external locking mechanism or structuring your workflow to prevent concurrent operations through your CI/CD pipeline.

## Server-Side Encryption

COS supports multiple encryption options.

### SSE-COS (Default Encryption)

Use COS-managed keys for encryption:

```hcl
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "terraform-state-1234567890"
    prefix = "terraform/state"

    # Enable server-side encryption with COS-managed keys
    encrypt = true
  }
}
```

### SSE-KMS

Use Tencent Cloud KMS for customer-managed encryption:

```hcl
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "terraform-state-1234567890"
    prefix = "terraform/state"

    # Enable KMS encryption
    encrypt    = true
    kms_key_id = "your-kms-key-id"
  }
}
```

## Bucket Policy for Access Control

Create a fine-grained bucket policy:

```json
{
  "version": "2.0",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "qcs": [
          "qcs::cam::uin/100000000001:uin/100000000002"
        ]
      },
      "Action": [
        "name/cos:GetObject",
        "name/cos:PutObject",
        "name/cos:DeleteObject",
        "name/cos:GetBucket",
        "name/cos:HeadObject"
      ],
      "Resource": [
        "qcs::cos:ap-guangzhou:uid/1234567890:terraform-state-1234567890/terraform/*"
      ]
    }
  ]
}
```

Apply it via the console or CLI.

## Organizing Multiple Environments

Use different prefixes for different environments:

```hcl
# Development
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "terraform-state-1234567890"
    prefix = "dev/networking"
  }
}

# Production
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "terraform-state-1234567890"
    prefix = "prod/networking"
  }
}
```

Or use separate buckets per environment for stronger isolation:

```hcl
# Production with its own bucket
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "terraform-state-prod-1234567890"
    prefix = "networking"
  }
}
```

## Versioning and Recovery

Enable versioning on your bucket to keep historical state versions:

```bash
# Enable versioning (if not already enabled)
tccli cos PutBucketVersioning \
  --Bucket "terraform-state-1234567890" \
  --Region "ap-guangzhou" \
  --Status "Enabled"
```

To recover a previous state version:

```bash
# List object versions
tccli cos ListObjectVersions \
  --Bucket "terraform-state-1234567890" \
  --Region "ap-guangzhou" \
  --Prefix "terraform/state/terraform.tfstate"

# Download a specific version
tccli cos GetObject \
  --Bucket "terraform-state-1234567890" \
  --Region "ap-guangzhou" \
  --Key "terraform/state/terraform.tfstate" \
  --VersionId "version-id-here" \
  --OutputFile "recovered-state.tfstate"
```

## Partial Configuration

Keep credentials out of your codebase:

```hcl
# backend.tf - only non-sensitive values
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    prefix = "terraform/state"
  }
}
```

```bash
# Pass sensitive values at init time
terraform init \
  -backend-config="bucket=terraform-state-1234567890" \
  -backend-config="secret_id=${TENCENTCLOUD_SECRET_ID}" \
  -backend-config="secret_key=${TENCENTCLOUD_SECRET_KEY}"
```

Or use a backend config file:

```hcl
# backend.hcl
bucket     = "terraform-state-1234567890"
secret_id  = "your-secret-id"
secret_key = "your-secret-key"
```

```bash
terraform init -backend-config=backend.hcl
```

## Lifecycle Rules

Set up lifecycle rules to manage storage costs:

```json
{
  "Rule": [
    {
      "ID": "cleanup-old-versions",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "terraform/"
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```

This deletes non-current versions after 90 days while keeping the latest version indefinitely.

## Monitoring and Logging

Enable COS logging to track access to your state files:

```bash
# Enable access logging for the state bucket
tccli cos PutBucketLogging \
  --Bucket "terraform-state-1234567890" \
  --Region "ap-guangzhou" \
  --TargetBucket "logs-bucket-1234567890" \
  --TargetPrefix "cos-logs/terraform-state/"
```

You can also set up Cloud Monitor alerts for unusual access patterns.

## Cross-Region Replication

For disaster recovery, enable cross-region replication:

```bash
# Configure cross-region replication to a backup region
# This ensures state survival even if an entire region goes down
tccli cos PutBucketReplication \
  --Bucket "terraform-state-1234567890" \
  --Region "ap-guangzhou" \
  --Role "qcs::cam::uin/100000000001:uin/100000000001" \
  --DestBucket "terraform-state-backup-1234567890" \
  --DestRegion "ap-beijing" \
  --Status "Enabled"
```

## Summary

Tencent Cloud COS is the go-to backend for Terraform state when working with Tencent Cloud infrastructure. It provides object versioning for state recovery, server-side encryption for security, and integrates with Tencent Cloud's IAM system for access control. The setup follows the same patterns as other cloud storage backends - create a bucket, configure the backend block, and initialize. While it lacks built-in state locking, proper CI/CD pipeline design can mitigate concurrent access risks. For a comparison with other backend options, check out our posts on the [GCS backend](https://oneuptime.com/blog/post/2026-02-23-terraform-gcs-backend/view) or [Azure Blob Storage backend](https://oneuptime.com/blog/post/2026-02-23-terraform-azure-blob-storage-backend/view).
