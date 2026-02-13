# How to Use Terraform State with S3 Backend and DynamoDB Locking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, S3, DynamoDB, Infrastructure

Description: Set up remote Terraform state storage with S3 and DynamoDB locking to enable team collaboration, prevent state corruption, and maintain infrastructure safety.

---

Terraform state is the single most important file in your infrastructure setup. It maps your configuration to real-world resources. Lose it and Terraform doesn't know what exists. Corrupt it and deployments break in unpredictable ways. Using local state works for solo experiments, but the moment you're working with a team, you need remote state with locking.

The standard approach on AWS is S3 for storage and DynamoDB for locking. Let's set it up properly.

## Why Remote State Matters

Local state (`terraform.tfstate`) is a file on your disk. That creates several problems:

- **No collaboration** - Two people can't run Terraform at the same time without risking state corruption
- **No history** - If you accidentally delete or corrupt the file, your infrastructure is orphaned
- **No locking** - Nothing prevents concurrent modifications
- **Security risk** - The state file contains sensitive data (passwords, keys) in plaintext

Remote state with S3 solves all of these:

- S3 gives you durable, versioned storage
- DynamoDB provides locking to prevent concurrent operations
- IAM controls who can access the state
- Encryption protects sensitive data at rest

## The Chicken-and-Egg Problem

There's an inherent bootstrap problem: you need AWS resources (S3 bucket, DynamoDB table) to store Terraform state, but you'd normally use Terraform to create AWS resources. The standard solution is to create the backend resources first, either manually or with a separate Terraform configuration that uses local state.

## Creating the Backend Resources

Here's a Terraform configuration for the backend infrastructure. Run this once with local state.

```hcl
# backend-setup/main.tf
# This creates the resources needed for remote state
# Run this with local state: terraform init && terraform apply

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for storing Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-company-terraform-state"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "Terraform State"
    ManagedBy   = "terraform"
    Environment = "shared"
  }
}

# Enable versioning so you can recover previous state files
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
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name      = "Terraform State Locks"
    ManagedBy = "terraform"
  }
}

# Output the resource identifiers
output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "lock_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}
```

Apply this configuration.

```bash
cd backend-setup
terraform init
terraform apply
```

## Configuring the S3 Backend

Now configure your actual Terraform project to use the remote backend.

```hcl
# In your main Terraform project
terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "prod/networking/terraform.tfstate" # Unique path per project
    region         = "us-east-1"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

The `key` parameter is the path within the S3 bucket where this project's state file lives. Use a meaningful hierarchy like `{environment}/{component}/terraform.tfstate`.

## Migrating from Local to Remote State

If you already have local state, migrate it to S3.

```bash
# Add the backend configuration to your terraform block, then:
terraform init -migrate-state

# Terraform will ask:
# Do you want to copy existing state to the new backend? (yes/no)
# Type: yes
```

Terraform copies your local state to S3 and starts using it remotely. The local file remains as a backup, but Terraform won't use it anymore.

## State Locking in Action

When you run `terraform plan` or `terraform apply`, Terraform acquires a lock in DynamoDB. This prevents anyone else from modifying the state simultaneously.

```bash
# You'll see this during operations:
# Acquiring state lock. This may take a few moments...

# If someone else is running Terraform:
# Error: Error acquiring the state lock
# Lock Info:
#   ID:        12345-abcde-...
#   Path:      my-company-terraform-state/prod/networking/terraform.tfstate
#   Operation: OperationTypeApply
#   Who:       user@hostname
#   Created:   2026-02-12 10:30:00 UTC
```

## Force Unlocking State

Sometimes a lock gets stuck - maybe a CI job was cancelled or someone's laptop crashed mid-apply.

```bash
# Force unlock a stuck state lock (use with caution!)
terraform force-unlock LOCK_ID

# Example:
terraform force-unlock 12345-abcde-67890-fghij
```

Only do this if you're sure the other operation isn't actually running. Force unlocking while someone else is applying can corrupt your state.

## State File Organization

For larger organizations, organize state files by environment and component.

```
s3://my-company-terraform-state/
  prod/
    networking/terraform.tfstate
    database/terraform.tfstate
    compute/terraform.tfstate
  staging/
    networking/terraform.tfstate
    database/terraform.tfstate
    compute/terraform.tfstate
  shared/
    dns/terraform.tfstate
    iam/terraform.tfstate
```

## Referencing State from Other Projects

Use `terraform_remote_state` to read outputs from another state file.

```hcl
# In the compute project, read the networking project's outputs
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-company-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the outputs
resource "aws_instance" "web" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_id
  # ...
}
```

## State Bucket Lifecycle Policy

Old state versions accumulate. Add a lifecycle policy to clean up.

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90  # Keep 90 days of state history
    }
  }
}
```

## IAM Policy for State Access

Restrict who can access the state bucket.

```hcl
# IAM policy for Terraform operators
resource "aws_iam_policy" "terraform_state_access" {
  name = "TerraformStateAccess"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      }
    ]
  })
}
```

## Wrapping Up

Remote state with S3 and DynamoDB is table stakes for team-based Terraform workflows. Set it up before you write your first real resource, organize your state files logically, and lock down access with IAM. The bucket versioning will save you when someone inevitably corrupts the state, and the DynamoDB locking will prevent the corruption in the first place.

For managing authentication to this backend, see our guide on [configuring AWS provider authentication](https://oneuptime.com/blog/post/2026-02-12-configure-aws-provider-authentication-in-terraform/view). And if you're using Terragrunt, check out how it [simplifies backend configuration](https://oneuptime.com/blog/post/2026-02-12-terragrunt-for-dry-terraform-aws-configurations/view).
