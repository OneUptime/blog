# How to Configure Terraform State Management for Kubernetes Resources Using S3 and DynamoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, State Management

Description: Learn how to set up secure Terraform state storage using AWS S3 and DynamoDB for locking, enabling team collaboration on Kubernetes infrastructure with encryption and versioning.

---

Terraform state tracks your infrastructure. For team environments, you need remote state storage with locking to prevent conflicts. AWS S3 with DynamoDB provides reliable state management with encryption, versioning, and atomic locking for Kubernetes infrastructure.

This guide shows you how to configure S3 backends for production Terraform workflows.

## Understanding Remote State Requirements

Remote state needs three things: storage, locking, and encryption. S3 provides durable storage with versioning. DynamoDB provides distributed locking so only one person can modify infrastructure at a time. AWS KMS provides encryption for sensitive data in state files.

Without locking, two people running terraform apply simultaneously can corrupt state. Without encryption, secrets in state are vulnerable.

## Creating the S3 Bucket

Create infrastructure for state storage:

```hcl
# state-backend/main.tf
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "state_bucket_name" {
  type = string
}

variable "dynamodb_table_name" {
  type    = string
  default = "terraform-state-lock"
}

# KMS key for encryption
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "terraform-state-key"
  }
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# S3 bucket for state storage
resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name

  tags = {
    Name        = "Terraform State"
    Environment = "Production"
  }
}

# Enable versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.terraform_state.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# DynamoDB table for locking
resource "aws_dynamodb_table" "terraform_lock" {
  name           = var.dynamodb_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "Terraform State Lock"
    Environment = "Production"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.terraform_state.arn
  }
}

# IAM policy for state access
resource "aws_iam_policy" "terraform_state" {
  name        = "terraform-state-access"
  description = "Policy for Terraform state access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3StateAccess"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      },
      {
        Sid    = "AllowDynamoDBLocking"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = aws_dynamodb_table.terraform_lock.arn
      },
      {
        Sid    = "AllowKMSEncryption"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.terraform_state.arn
      }
    ]
  })
}

output "s3_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.terraform_lock.name
}

output "kms_key_id" {
  value = aws_kms_key.terraform_state.key_id
}
```

Deploy the backend infrastructure:

```bash
cd state-backend
terraform init
terraform apply -var="state_bucket_name=my-terraform-state-bucket"
```

## Configuring Backend in Main Project

Use the S3 backend:

```hcl
# kubernetes-infrastructure/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "kubernetes/production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-west-2:ACCOUNT:key/KEY-ID"
    dynamodb_table = "terraform-state-lock"
  }
}
```

Initialize with the backend:

```bash
cd kubernetes-infrastructure
terraform init
```

## Implementing Multi-Environment State

Separate state files by environment:

```hcl
# kubernetes-infrastructure/backend-dev.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "kubernetes/development/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-west-2:ACCOUNT:key/KEY-ID"
    dynamodb_table = "terraform-state-lock"
  }
}
```

```hcl
# kubernetes-infrastructure/backend-prod.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "kubernetes/production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-west-2:ACCOUNT:key/KEY-ID"
    dynamodb_table = "terraform-state-lock"
  }
}
```

## Using Partial Configuration

Keep backend config out of version control:

```hcl
# backend.tf (committed to Git)
terraform {
  backend "s3" {}
}
```

```hcl
# backend-config.hcl (not in Git)
bucket         = "my-terraform-state-bucket"
key            = "kubernetes/production/terraform.tfstate"
region         = "us-west-2"
encrypt        = true
kms_key_id     = "arn:aws:kms:us-west-2:ACCOUNT:key/KEY-ID"
dynamodb_table = "terraform-state-lock"
```

Initialize with config file:

```bash
terraform init -backend-config=backend-config.hcl
```

## Migrating Existing State

Move local state to S3:

```bash
# Add backend configuration
cat > backend.tf <<EOF
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "kubernetes/production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
EOF

# Migrate state
terraform init -migrate-state
```

## Implementing State Locking

Test locking behavior:

```bash
# Terminal 1
terraform plan
# Holds lock while running

# Terminal 2 (while Terminal 1 is running)
terraform plan
# Error: state is locked
```

Force unlock if needed (use carefully):

```bash
terraform force-unlock LOCK_ID
```

## Summary

S3 and DynamoDB provide production-grade Terraform state management. Encryption protects sensitive data, versioning enables recovery, and locking prevents conflicts. This setup scales from small teams to large organizations managing dozens of Kubernetes clusters across multiple environments. Proper state management is essential for reliable infrastructure automation and team collaboration.
