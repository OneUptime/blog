# How to Configure the COS Backend (Tencent Cloud) in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend

Description: Learn how to configure the COS (Cloud Object Storage) backend in OpenTofu to store state in Tencent Cloud Object Storage with built-in locking.

## Introduction

The COS backend stores OpenTofu state in Tencent Cloud Object Storage (COS). It uses COS for state persistence and supports workspace isolation through key prefixes. This is the standard remote backend for teams using Tencent Cloud infrastructure.

## Basic Configuration

```hcl
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "acme-tofu-state-1234567890"
    prefix = "production"
  }
}
```

State is stored at: `production/terraform.tfstate` within the bucket.

## Authentication

```hcl
terraform {
  backend "cos" {
    region     = "ap-guangzhou"
    bucket     = "acme-tofu-state-1234567890"
    prefix     = "production"
    secret_id  = var.tencent_secret_id
    secret_key = var.tencent_secret_key
  }
}
```

Or via environment variables (preferred for CI/CD):

```bash
export TENCENTCLOUD_SECRET_ID="your-secret-id"
export TENCENTCLOUD_SECRET_KEY="your-secret-key"
export TENCENTCLOUD_REGION="ap-guangzhou"

tofu init
```

## Creating the COS Bucket

```bash
# Using tccli (Tencent Cloud CLI)

tccli cos create-bucket \
  --bucket acme-tofu-state-1234567890 \
  --region ap-guangzhou

# Enable versioning for state history
tccli cos put-bucket-versioning \
  --bucket acme-tofu-state-1234567890 \
  --region ap-guangzhou \
  --status Enabled
```

## Multiple Environments

```hcl
# production/backend.tf
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "acme-tofu-state-1234567890"
    prefix = "production/infrastructure"
  }
}

# staging/backend.tf
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "acme-tofu-state-1234567890"
    prefix = "staging/infrastructure"
  }
}
```

## State Locking

The COS backend supports state locking out of the box using Tencent Cloud's Tag service. Locking is automatic and requires `CreateTag`, `DeleteTag`, and `DescribeTags` permissions on the tag key `tencentcloud-terraform-lock`. No extra configuration is needed:

```hcl
terraform {
  backend "cos" {
    region  = "ap-guangzhou"
    bucket  = "acme-tofu-state-1234567890"
    prefix  = "production"
    # Locking is handled automatically by the backend
  }
}
```

## Encryption

```hcl
terraform {
  backend "cos" {
    region            = "ap-guangzhou"
    bucket            = "acme-tofu-state-1234567890"
    prefix            = "production"
    encrypt           = true
    acl               = "private"
  }
}
```

## CAM Policy for State Access

```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": [
        "name/cos:GetObject",
        "name/cos:PutObject",
        "name/cos:DeleteObject",
        "name/cos:GetBucket"
      ],
      "resource": [
        "qcs::cos:ap-guangzhou:uid/1234567890:acme-tofu-state-1234567890/production/*"
      ]
    }
  ]
}
```

## Workspace Isolation

```bash
# Workspaces store state at separate prefixes
tofu workspace new staging
tofu workspace new production
tofu workspace list
```

State is organized as:
```text
production/
├── terraform.tfstate      (default workspace)
├── env:/staging/          (staging workspace)
└── env:/production/       (production workspace)
```

## Conclusion

The COS backend provides reliable state storage for Tencent Cloud deployments. Create a dedicated COS bucket with versioning enabled, use environment variables for credentials rather than hardcoding them, and apply least-privilege CAM policies to restrict state access to authorized identities.
