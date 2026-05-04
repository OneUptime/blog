# How to Configure the S3 Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, AWS, State Management

Description: Learn how to configure the AWS S3 backend in OpenTofu for team-friendly remote state storage with versioning, encryption, and state locking.

## Introduction

The S3 backend is the most widely used remote backend for AWS-based infrastructure. It stores state in an S3 bucket and supports DynamoDB-based or native locking, server-side encryption, and versioning. This guide covers a complete S3 backend setup.

## Step 1: Create the S3 Bucket and DynamoDB Table

Before configuring the backend, create the required AWS resources:

```hcl
# bootstrap/main.tf - Run this once to create state infrastructure

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for state

resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-company-terraform-state"

  lifecycle {
    prevent_destroy = true  # Protect against accidental deletion
  }
}

# Enable versioning
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

## Step 2: Configure the S3 Backend

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket = "my-company-terraform-state"
    key    = "prod/terraform.tfstate"  # Path within the bucket
    region = "us-east-1"

    # Enable encryption at rest
    encrypt = true

    # DynamoDB table for state locking
    dynamodb_table = "terraform-state-locks"
  }
}
```

## Step 3: Initialize the Backend

```bash
# Initialize the backend
tofu init

# Expected output:
# Initializing the backend...
# Successfully configured the backend "s3"!
# OpenTofu will automatically use this backend unless the backend
# configuration changes.
```

## Required IAM Permissions

The AWS identity running OpenTofu needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::my-company-terraform-state/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-company-terraform-state"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:DescribeTable",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/terraform-state-locks"
    }
  ]
}
```

## Key Organization

Organize state files within the bucket using a consistent key structure:

```hcl
# Different configurations use different keys
# Networking stack
key = "networking/terraform.tfstate"

# Application stack
key = "application/prod/terraform.tfstate"

# Per-region
key = "us-east-1/networking/terraform.tfstate"

# Per-team
key = "platform-team/eks-cluster/terraform.tfstate"
```

## Using Workspaces with S3

```hcl
terraform {
  backend "s3" {
    bucket = "my-company-terraform-state"
    key    = "app/terraform.tfstate"
    region = "us-east-1"

    # Workspaces use this prefix
    # workspace_key_prefix = "workspace"  # Default: "env:"
    # Results in: env:prod/app/terraform.tfstate
  }
}
```

## Verifying Backend Configuration

```bash
# Verify state is accessible
tofu state list

# Force re-initialization of the backend, ignoring any existing configuration
tofu init -reconfigure

# Check the S3 bucket directly
aws s3 ls s3://my-company-terraform-state/ --recursive
```

## Conclusion

The S3 backend is a production-ready choice for AWS infrastructure managed with OpenTofu. By combining S3 versioning, server-side encryption, public access blocking, and DynamoDB locking, you get a robust, secure, and collaborative state management solution. Establish a consistent key naming convention early to keep your state files organized as your infrastructure grows.
