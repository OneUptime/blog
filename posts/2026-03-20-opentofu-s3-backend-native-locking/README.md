# How to Configure S3 Backend with Native State Locking in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, AWS

Description: Learn how to configure the OpenTofu S3 backend with native state locking using S3 conditional writes, eliminating the need for a separate DynamoDB table.

## Introduction

OpenTofu's enhanced S3 backend supports native state locking using S3's conditional write feature. This eliminates the need for a separate DynamoDB table for locking, simplifying the backend setup while still providing concurrency protection.

## Native Locking Configuration

```hcl
terraform {
  backend "s3" {
    bucket = "my-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    encrypt = true

    # Enable native S3 locking (no DynamoDB needed)
    use_lockfile = true
  }
}
```

## How Native Locking Works

Native S3 locking uses S3's conditional writes (`If-None-Match: *`) to create a lock file atomically:

```text
Lock file: s3://my-tofu-state/production/terraform.tfstate.tflock
```

When a run starts, it creates the lock file. Concurrent runs that detect the lock file wait or fail with a lock error.

## Comparison: Native vs DynamoDB Locking

| Feature | Native S3 Locking | DynamoDB Locking |
|---|---|---|
| Additional service | No | Yes (DynamoDB) |
| Cost | Free (S3 operations) | ~$0.25/month minimum |
| Lock file location | Same bucket | DynamoDB table |
| Infrastructure required | S3 bucket only | S3 bucket + DynamoDB table |
| Reliability | High | High |
| OpenTofu version | 1.10+ | All versions |

## S3 Bucket Requirements

Enabling object versioning on the S3 bucket is highly recommended for state recovery and reliable lock file management:

```hcl
resource "aws_s3_bucket_versioning" "tofu_state" {
  bucket = aws_s3_bucket.tofu_state.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## Full Configuration with Native Locking

```hcl
terraform {
  backend "s3" {
    bucket       = "my-tofu-state"
    key          = "production/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
    # No dynamodb_table needed!
  }
}
```

## Lock File Contents

The lock file is a JSON file created during operations:

```json
{
  "ID": "abc-123-def-456",
  "Operation": "OperationTypePlan",
  "Info": "",
  "Who": "user@hostname",
  "Version": "1.10.0",
  "Created": "2026-03-20T10:00:00Z",
  "Path": "production/terraform.tfstate"
}
```

## Force-Unlock with Native Locking

If a lock gets stuck (e.g., a run crashed):

```bash
# List the lock file

aws s3 ls s3://my-tofu-state/production/terraform.tfstate.tflock

# Remove the stuck lock
aws s3 rm s3://my-tofu-state/production/terraform.tfstate.tflock

# Or use the OpenTofu force-unlock command with the lock ID
tofu force-unlock LOCK-ID
```

## Migrating from DynamoDB to Native Locking

```hcl
# Before: DynamoDB locking
terraform {
  backend "s3" {
    bucket         = "my-tofu-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tofu-state-lock"
  }
}

# After: Native S3 locking
terraform {
  backend "s3" {
    bucket       = "my-tofu-state"
    key          = "production/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    # Remove dynamodb_table
  }
}
```

```bash
# Re-initialize after changing locking mechanism
tofu init -reconfigure
```

## Conclusion

Native S3 locking simplifies the backend setup by eliminating the DynamoDB dependency while providing equivalent concurrency protection. Enable it with `use_lockfile = true` on OpenTofu 1.10 or later. Enabling versioning on the S3 bucket is highly recommended for state recovery and reliable lock file management, and use `tofu force-unlock` or direct S3 deletion to clear stuck locks.
