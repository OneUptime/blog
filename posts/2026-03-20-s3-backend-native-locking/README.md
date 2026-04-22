# How to Configure S3 Backend with Native State Locking in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, AWS, State Management

Description: Learn how to configure the OpenTofu S3 backend with native S3 state locking (available in OpenTofu 1.10+), eliminating the need for a separate DynamoDB table.

## Introduction

Traditionally, the S3 backend required a DynamoDB table for state locking. OpenTofu 1.10 introduced native S3 state locking using S3's conditional writes feature, eliminating the DynamoDB dependency. This simplifies setup, reduces costs, and removes a failure point from your state management infrastructure.

## Prerequisites

- OpenTofu 1.10 or later
- S3 bucket for state storage (bucket versioning recommended)
- AWS S3, or an S3-compatible service that supports conditional `If-None-Match` writes

## Configuring Native S3 Locking

```hcl
# backend.tf

terraform {
  backend "s3" {
    bucket  = "my-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true

    # Enable native S3 locking (OpenTofu 1.10+)
    # No dynamodb_table needed!
    use_lockfile = true
  }
}
```

The `use_lockfile = true` setting enables a lock file approach - OpenTofu creates a `.tflock` file in S3 to prevent concurrent operations.

## How Native Locking Works

When a `tofu plan` or `tofu apply` starts:

1. OpenTofu creates a `.tflock` file in S3 alongside the state file
2. If the lock file already exists, the operation waits or fails
3. When the operation completes, the lock file is deleted

Lock file path: `prod/terraform.tfstate.tflock` (adjacent to the state file)

## Creating the S3 Bucket for Native Locking

The bucket needs no special DynamoDB configuration:

```hcl
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# No DynamoDB table needed!
```

## IAM Permissions for Native Locking

With native locking, you need slightly different S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-terraform-state/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-terraform-state"
    }
  ]
}
```

No DynamoDB permissions needed - a significant simplification.

If you use a customer-managed KMS key for bucket encryption, also grant the OpenTofu role the required KMS permissions.

## Migrating from DynamoDB Locking to Native Locking

```hcl
# Before: DynamoDB-based locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"  # Will be removed
  }
}
```

```hcl
# After: Native S3 locking
terraform {
  backend "s3" {
    bucket       = "my-terraform-state"
    key          = "prod/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true  # New native locking
    # dynamodb_table removed
  }
}
```

```bash
# Re-init with the new configuration
tofu init -reconfigure

# The DynamoDB table can now be decommissioned
# (once all configurations are migrated)
```

## Force Unlocking Native Locks

```bash
# View lock file in S3
aws s3 ls s3://my-terraform-state/prod/terraform.tfstate.tflock

# Force unlock via OpenTofu
tofu force-unlock <lock-id>

# Or manually delete the lock file
aws s3 rm s3://my-terraform-state/prod/terraform.tfstate.tflock
```

## Compatibility Note

If you have a mix of OpenTofu versions on your team:
- OpenTofu 1.10+ supports `use_lockfile = true`
- Older versions only support DynamoDB locking
- Consider a phased migration when updating versions

## Conclusion

Native S3 locking in OpenTofu 1.10+ simplifies the S3 backend setup by eliminating the DynamoDB dependency. This reduces infrastructure costs, simplifies IAM permissions, and removes a potential failure point. For new projects, use native locking from the start. For existing projects, migrate from DynamoDB locking during your next OpenTofu upgrade cycle.
