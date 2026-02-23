# How to Use OpenTofu with S3 Backend

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, S3, State Management, Backend

Description: Learn how to configure and use the S3 backend in OpenTofu for remote state storage, including DynamoDB locking, encryption, cross-account access, and best practices.

---

Storing OpenTofu state in Amazon S3 is the most popular remote backend option for AWS users. It provides durability, versioning, encryption, and when combined with DynamoDB, state locking to prevent concurrent modifications. This guide covers setting up the S3 backend from scratch, including the supporting infrastructure.

## Why Use an S3 Backend

Local state files work fine for personal projects, but they fall apart in teams. The S3 backend solves several problems:

- State is stored remotely so all team members access the same state
- S3 versioning keeps a history of state changes for rollback
- DynamoDB provides locking to prevent two people from applying at the same time
- Server-side encryption protects sensitive data in state
- S3 lifecycle policies can manage old state versions

## Creating the S3 Backend Infrastructure

Before you can use the S3 backend, you need the bucket and DynamoDB table. Here is the chicken-and-egg problem: you need infrastructure to store state, but you usually use OpenTofu to create infrastructure. The solution is to create the backend resources with a separate configuration that uses local state, or create them manually.

```hcl
# backend-setup/main.tf
# This configuration creates the S3 backend infrastructure
# Run this with local state first

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for state storage
resource "aws_s3_bucket" "terraform_state" {
  bucket = "myorg-opentofu-state"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "OpenTofu State"
    ManagedBy   = "opentofu"
  }
}

# Enable versioning for state history
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "opentofu-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name      = "OpenTofu State Locks"
    ManagedBy = "opentofu"
  }
}

output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}
```

```bash
# Create the backend infrastructure
cd backend-setup
tofu init
tofu apply
```

## Configuring the S3 Backend

With the infrastructure in place, configure your project to use it:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "myorg-opentofu-state"
    key            = "production/network/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opentofu-state-locks"
    encrypt        = true
  }
}
```

```bash
# Initialize with the S3 backend
tofu init

# If migrating from local state, you will be prompted:
# "Do you want to copy existing state to the new backend?"
# Type "yes"
```

## Organizing State Keys

The `key` parameter determines where in the bucket your state is stored. Use a consistent naming convention:

```hcl
# Pattern: environment/component/terraform.tfstate

# Production network
backend "s3" {
  key = "production/network/terraform.tfstate"
}

# Production compute
backend "s3" {
  key = "production/compute/terraform.tfstate"
}

# Staging network
backend "s3" {
  key = "staging/network/terraform.tfstate"
}
```

This organization makes it easy to find state files and set up IAM policies per environment.

## Using Workspaces with S3

When using workspaces, OpenTofu automatically namespaces the state key:

```bash
# Create workspaces
tofu workspace new staging
tofu workspace new production

# State is stored at:
# env:/staging/<key>
# env:/production/<key>
# The default workspace uses the key directly
```

```hcl
# With this backend configuration:
backend "s3" {
  key = "app/terraform.tfstate"
}

# The state keys become:
# Default workspace:  app/terraform.tfstate
# Staging workspace:  env:/staging/app/terraform.tfstate
# Production workspace: env:/production/app/terraform.tfstate
```

## Cross-Account State Access

In multi-account AWS setups, you often need the state bucket in a central account:

```hcl
# Backend in a shared services account
terraform {
  backend "s3" {
    bucket         = "shared-opentofu-state"
    key            = "production/app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opentofu-state-locks"
    encrypt        = true

    # Assume a role in the shared services account to access the bucket
    role_arn = "arn:aws:iam::111111111111:role/OpenTofuStateAccess"
  }
}

# Provider configured for the workload account
provider "aws" {
  region = "us-east-1"
  # This uses the default credentials for the workload account
}
```

The IAM role for state access needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::shared-opentofu-state",
        "arn:aws:s3:::shared-opentofu-state/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:111111111111:table/opentofu-state-locks"
    }
  ]
}
```

## Using KMS Encryption

For enhanced security, use a custom KMS key for state encryption:

```hcl
terraform {
  backend "s3" {
    bucket         = "myorg-opentofu-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opentofu-state-locks"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  }
}
```

## Partial Backend Configuration

To avoid hardcoding backend values (useful for multiple environments), use partial configuration:

```hcl
# backend.tf
terraform {
  backend "s3" {
    # Only specify what's constant
    region         = "us-east-1"
    dynamodb_table = "opentofu-state-locks"
    encrypt        = true
  }
}
```

```bash
# Pass environment-specific values at init time
tofu init \
  -backend-config="bucket=myorg-opentofu-state" \
  -backend-config="key=production/app/terraform.tfstate"

# Or use a backend config file
cat > backend-prod.hcl << 'EOF'
bucket = "myorg-opentofu-state"
key    = "production/app/terraform.tfstate"
EOF

tofu init -backend-config=backend-prod.hcl
```

## State Locking Details

The DynamoDB locking mechanism prevents concurrent state modifications:

```bash
# Locking is automatic during plan and apply
tofu plan  # Acquires lock, plans, releases lock
tofu apply  # Acquires lock, applies, releases lock

# If a lock is stuck (process crashed), force unlock
tofu force-unlock LOCK_ID

# The lock ID is shown in the error message:
# Error: Error acquiring the state lock
# Lock Info:
#   ID:        12345678-abcd-efgh-ijkl-123456789012
```

## Recovering from State Issues

If something goes wrong with your remote state:

```bash
# Pull state to a local file
tofu state pull > state-backup.json

# Push a state file to the backend
tofu state push state-backup.json

# List state versions in S3 (using AWS CLI)
aws s3api list-object-versions \
  --bucket myorg-opentofu-state \
  --prefix production/app/terraform.tfstate

# Restore a previous state version
aws s3api get-object \
  --bucket myorg-opentofu-state \
  --key production/app/terraform.tfstate \
  --version-id "abc123" \
  restored-state.json

tofu state push restored-state.json
```

## Best Practices

**Enable bucket versioning.** This is your safety net. If state gets corrupted, you can restore a previous version.

**Use a dedicated bucket for state.** Do not mix state files with application data. It simplifies IAM policies and lifecycle management.

**Enable access logging.** Know who accessed your state files and when.

```hcl
resource "aws_s3_bucket_logging" "state_logging" {
  bucket = aws_s3_bucket.terraform_state.id

  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "state-access-logs/"
}
```

**Set up S3 lifecycle rules** to manage old state versions:

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "state_lifecycle" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

The S3 backend is battle-tested and reliable. With proper setup, it handles state management for teams of any size.

For other backend options, check out [How to Use OpenTofu with Azure Backend](https://oneuptime.com/blog/post/use-opentofu-with-azure-backend/view) and [How to Use OpenTofu with GCS Backend](https://oneuptime.com/blog/post/use-opentofu-with-gcs-backend/view).
