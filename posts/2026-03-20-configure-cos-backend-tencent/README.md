# How to Configure the COS Backend (Tencent Cloud) in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Tencent Cloud, State Management

Description: Learn how to configure the OpenTofu COS backend to store state files in Tencent Cloud Object Storage with versioning, encryption, and state locking.

## Introduction

The COS (Cloud Object Storage) backend stores OpenTofu state in Tencent Cloud Object Storage. It's the recommended remote state backend for infrastructure deployed on Tencent Cloud, providing versioning, encryption, and state locking support.

## Prerequisites

- Tencent Cloud account with COS service enabled
- SecretId and SecretKey with COS permissions, or credentials that can assume a CAM role
- COS bucket created in your target region

## Step 1: Create the COS Bucket

```bash
# Using COSCLI

./coscli mb cos://my-terraform-state-1234567890 \
  -e cos.ap-guangzhou.myqcloud.com

# Enable versioning
./coscli bucket-versioning --method put \
  cos://my-terraform-state-1234567890 \
  Enabled \
  -e cos.ap-guangzhou.myqcloud.com
```

Or via the Tencent Cloud Console: COS → Bucket List → Create Bucket

## Step 2: Configure the COS Backend

```hcl
# backend.tf
terraform {
  backend "cos" {
    region = "ap-guangzhou"         # COS region
    bucket = "my-terraform-state-1234567890"  # Bucket name (includes AppID)
    prefix = "terraform/state/prod" # Path prefix in the bucket

    # Optional: explicit, though true is the default
    encrypt = true

    # Optional: enable global acceleration
    # accelerate = true
  }
}
```

## Authentication Configuration

### Using Environment Variables

```bash
# Set credentials via environment variables
export TENCENTCLOUD_SECRET_ID="AKID..."
export TENCENTCLOUD_SECRET_KEY="your-secret-key"
export TENCENTCLOUD_REGION="ap-guangzhou"
```

### Using Credentials in Backend Config

```hcl
terraform {
  backend "cos" {
    region     = "ap-guangzhou"
    bucket     = "my-terraform-state-1234567890"
    prefix     = "terraform/state/prod"
    secret_id  = var.tencent_secret_id   # Prefer env vars for secrets; avoid hardcoding
    secret_key = var.tencent_secret_key
  }
}
```

### Using Assume Role

If you want OpenTofu to assume a CAM role:

```hcl
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "my-terraform-state-1234567890"
    prefix = "terraform/state/prod"

    assume_role {
      role_arn         = "qcs::cam::uin/1234567890:roleName/TofuStateRole"
      session_name     = "tofu-backend"
      session_duration = 3600
    }
  }
}
```

## State File Organization

```text
COS bucket: my-terraform-state-1234567890
├── terraform/state/prod/terraform.tfstate
├── terraform/state/staging/terraform.tfstate
└── terraform/state/networking/terraform.tfstate
```

## Setting Up Permissions

Create a CAM policy with minimal permissions for the state prefix:

```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": [
        "name/cos:GetBucket"
      ],
      "resource": [
        "qcs::cos:ap-guangzhou:uid/1234567890:my-terraform-state-1234567890/"
      ]
    },
    {
      "effect": "allow",
      "action": [
        "name/cos:PutObject",
        "name/cos:GetObject",
        "name/cos:DeleteObject"
      ],
      "resource": [
        "qcs::cos:ap-guangzhou:uid/1234567890:my-terraform-state-1234567890/terraform/state/prod/*"
      ]
    }
  ]
}
```

For state locking, also allow the Tag service APIs `CreateTag`, `DeleteTag`, and `DescribeTags` for the `tencentcloud-terraform-lock` tag key, as required by the OpenTofu COS backend.

## Server-Side Encryption

```hcl
terraform {
  backend "cos" {
    region  = "ap-guangzhou"
    bucket  = "my-terraform-state-1234567890"
    prefix  = "terraform/state/prod"
    encrypt = true  # Explicit; this uses AES256 server-side encryption
  }
}
```

The OpenTofu COS backend does not support a `kms_key_id` argument. If you want SSE-KMS, configure default bucket encryption in COS and keep the backend configuration unchanged.

## Workspace Configuration

```bash
# Create workspaces
tofu workspace new production
tofu workspace new staging

# State file paths:
# terraform/state/prod/terraform.tfstate       ← default
# terraform/state/prod/production/terraform.tfstate  ← production workspace
```

## Initialize and Verify

```bash
# Set credentials
export TENCENTCLOUD_SECRET_ID="AKID..."
export TENCENTCLOUD_SECRET_KEY="your-secret-key"

# Initialize
tofu init

# Verify state is accessible
tofu state list

# Check bucket contents
./coscli ls cos://my-terraform-state-1234567890/terraform/state/ \
  -e cos.ap-guangzhou.myqcloud.com
```

## Conclusion

The COS backend provides a native Tencent Cloud state storage solution that integrates with Tencent Cloud CAM and COS encryption features. Enable versioning for state history, use server-side encryption for data protection, and apply CAM policies following least-privilege principles. If you need temporary credentials, use the backend's `assume_role` support instead of long-lived static credentials.
