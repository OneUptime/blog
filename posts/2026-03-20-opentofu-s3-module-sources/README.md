# How to Use S3 Bucket Module Sources in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Module, AWS

Description: Learn how to use AWS S3 bucket module sources in OpenTofu to host and distribute private modules using your existing AWS infrastructure.

## Introduction

OpenTofu can download modules directly from AWS S3 buckets. This is ideal for organizations already using S3 that want to distribute private modules without setting up a Git server or separate artifact repository.

## Syntax

```hcl
module "example" {
  source = "s3::https://s3.amazonaws.com/my-bucket/path/to/module.zip"

  # Or with a region-specific endpoint (note: buckets in us-east-1
  # must use s3.amazonaws.com, not s3-us-east-1.amazonaws.com)
  source = "s3::https://s3-eu-west-1.amazonaws.com/my-bucket/module.zip"
}
```

The `s3::` prefix tells OpenTofu to use S3-specific authentication.

## Examples

### Basic S3 Module Source

```hcl
module "vpc" {
  source = "s3::https://s3.amazonaws.com/mycompany-terraform-modules/vpc-v2.1.0.zip"

  cidr_block  = "10.0.0.0/16"
  az_count    = 3
  environment = var.environment
}
```

### Versioned Modules in S3

```hcl
# Use a versioned path structure for module management

module "security_groups" {
  source = "s3::https://s3.amazonaws.com/mycompany-modules/v1.5.0/security-groups.zip"

  vpc_id      = module.vpc.vpc_id
  environment = var.environment
}

module "rds" {
  source = "s3::https://s3.amazonaws.com/mycompany-modules/v1.5.0/rds.zip"

  subnet_ids  = module.vpc.private_subnet_ids
  environment = var.environment
}
```

## Publishing Modules to S3

### Step 1: Package the Module

```bash
# Create a versioned ZIP archive
cd modules/vpc
zip -r ../../releases/vpc-v1.0.0.zip .
```

### Step 2: Create the S3 Bucket

```hcl
resource "aws_s3_bucket" "modules" {
  bucket = "mycompany-terraform-modules"
}

resource "aws_s3_bucket_versioning" "modules" {
  bucket = aws_s3_bucket.modules.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "modules" {
  bucket = aws_s3_bucket.modules.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### Step 3: Upload Module Archives

```bash
aws s3 cp releases/vpc-v1.0.0.zip s3://mycompany-terraform-modules/vpc/vpc-v1.0.0.zip
aws s3 cp releases/vpc-v1.1.0.zip s3://mycompany-terraform-modules/vpc/vpc-v1.1.0.zip
```

## IAM Permissions for Module Download

The AWS credentials used by OpenTofu must have S3 read access:

```hcl
resource "aws_iam_policy" "module_reader" {
  name = "terraform-module-reader"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:ListBucket"]
      Resource = [
        "arn:aws:s3:::mycompany-terraform-modules",
        "arn:aws:s3:::mycompany-terraform-modules/*"
      ]
    }]
  })
}
```

## Step-by-Step Usage

1. Create the modules S3 bucket.
2. Package your module as a ZIP and upload to S3.
3. Reference with the `s3::` prefix.
4. Ensure AWS credentials have S3 read access.
5. Run `tofu init`.

```bash
# Assuming AWS credentials are configured
tofu init
tofu plan
```

## S3 vs Git Module Sources

| | S3 | Git |
|-|---|-----|
| Versioning | Via filename/path | Via Git tags |
| Access control | IAM policies | SSH/token |
| Already in AWS | Yes | Separate service |
| Immutable versions | Not by default | Yes (tags) |

## Conclusion

S3 bucket module sources are a natural fit for organizations running on AWS. They leverage existing IAM access control, S3 versioning, and replication capabilities for distributing private infrastructure modules. Use a consistent naming convention like `module-v1.2.3.zip` to maintain clear version history.
