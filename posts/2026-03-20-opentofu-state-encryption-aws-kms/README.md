# How to Configure State Encryption with AWS KMS in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, AWS, Encryption

Description: Learn how to configure OpenTofu state encryption using AWS KMS to protect state files with envelope encryption and IAM-controlled key access.

## Introduction

Using AWS KMS as the key provider for OpenTofu state encryption provides envelope encryption, automatic key rotation, and IAM-based access control. The KMS key encrypts a data key, which in turn encrypts the state - providing defense in depth beyond S3 server-side encryption alone.

## Configuration

```hcl
# versions.tf

terraform {
  required_version = ">= 1.7"

  encryption {
    key_provider "aws_kms" "main" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123-def-456"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "main" {
      keys = key_provider.aws_kms.main
    }

    state {
      method = method.aes_gcm.main
    }

    plan {
      method = method.aes_gcm.main
    }
  }

  backend "s3" {
    bucket = "my-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    # Note: encrypt=true is S3 SSE; the encryption block above is client-side
  }
}
```

## Creating the KMS Key

```hcl
# Create a KMS key for state encryption
resource "aws_kms_key" "tofu_state" {
  description             = "OpenTofu state encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Purpose = "terraform-state-encryption"
  }
}

resource "aws_kms_alias" "tofu_state" {
  name          = "alias/opentofu-state"
  target_key_id = aws_kms_key.tofu_state.key_id
}
```

## IAM Permissions for KMS

The identity running OpenTofu needs KMS permissions:

```hcl
resource "aws_iam_role_policy" "tofu_kms" {
  role = aws_iam_role.terraform_deployer.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.tofu_state.arn
      }
    ]
  })
}
```

## Using Key Alias

```hcl
key_provider "aws_kms" "main" {
  kms_key_id = "alias/opentofu-state"  # Use alias instead of ARN
  region     = "us-east-1"
  key_spec   = "AES_256"
}
```

## Cross-Region Key Configuration

```hcl
# Use a multi-region key for cross-region state
key_provider "aws_kms" "main" {
  kms_key_id = "mrk-abc123def456"  # Multi-Region Key ID
  region     = "us-east-1"
  key_spec   = "AES_256"
}
```

## Providing Credentials

The AWS KMS key provider uses the standard AWS credential chain:

```bash
# Instance profile (when running on EC2/EKS - recommended)
# No configuration needed

# Explicit credentials
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/..."

# AWS profile
export AWS_PROFILE="terraform-deployer"
```

## Verifying Encryption

```bash
# Download the state file - should be binary, not readable JSON
aws s3 cp s3://my-tofu-state/production/terraform.tfstate /tmp/state
file /tmp/state
# /tmp/state: data  (encrypted binary)

# OpenTofu can read it using KMS
tofu show
```

## Conclusion

AWS KMS state encryption combines client-side encryption with IAM access control. Anyone who can run `tofu plan` must also have KMS decrypt permissions, adding a second authorization layer beyond S3 bucket access. Enable key rotation on the KMS key and use multi-region keys for cross-region high availability.
