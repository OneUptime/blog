# How to Standardize OpenTofu Module Libraries Across Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Module Registry, Team Standards, Reusability, Infrastructure as Code

Description: Learn how to build and distribute a shared OpenTofu module library that enforces team standards, reduces duplication, and ensures consistency across multiple projects and teams.

---

A shared module library lets teams provision infrastructure using pre-approved, tested building blocks instead of writing the same patterns from scratch. Well-designed modules encode organizational standards - tagging, security defaults, naming conventions - so teams automatically comply without extra effort.

## Module Library Structure

```text
modules/
├── compute/
│   ├── ec2-instance/
│   ├── ecs-service/
│   └── lambda-function/
├── networking/
│   ├── vpc/
│   └── security-group/
├── storage/
│   ├── s3-bucket/
│   └── rds-instance/
└── observability/
    ├── cloudwatch-alarms/
    └── log-group/
```

## Module Design with Enforced Standards

```hcl
# modules/storage/s3-bucket/main.tf

variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, production)"
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging, or production"
  }
}

variable "team" {
  type        = string
  description = "Team that owns this bucket (used for cost allocation tags)"
}

variable "allow_public_access" {
  type    = bool
  default = false
  description = "Allow public access (only for static website hosting)"
}

# Bucket always has encryption, versioning, and public access blocking
resource "aws_s3_bucket" "this" {
  bucket = "${var.environment}-${var.bucket_name}"

  tags = {
    Environment = var.environment
    Team        = var.team
    ManagedBy   = "opentofu"
    Module      = "storage/s3-bucket"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = !var.allow_public_access
  block_public_policy     = !var.allow_public_access
  ignore_public_acls      = !var.allow_public_access
  restrict_public_buckets = !var.allow_public_access
}
```

## Publishing to GitHub Releases

```hcl
# Reference a published module version
module "app_bucket" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/storage/s3-bucket?ref=v2.3.0"

  bucket_name  = "app-data"
  environment  = var.environment
  team         = "platform"
}
```

## Private Module Registry with Terraform Cloud / OpenTofu Registry

```hcl
# Reference a private registry module
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "~> 3.0"

  cidr_block   = "10.0.0.0/16"
  environment  = var.environment
}
```

## Module Versioning Conventions

```hcl
# versions.tf in each module
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.20"
    }
  }
}
```

## Module Testing with Terratest

```go
// test/s3_bucket_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestS3BucketModule(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir: "../modules/storage/s3-bucket",
        Vars: map[string]interface{}{
            "bucket_name": "test-bucket",
            "environment": "dev",
            "team":        "test-team",
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    bucketName := terraform.Output(t, opts, "bucket_name")
    assert.Contains(t, bucketName, "dev-test-bucket")
}
```

## Best Practices

- Version all modules with semantic versioning and require callers to pin to `~> MAJOR.MINOR` to get patches automatically.
- Encode non-negotiable standards (encryption, tagging, access controls) in module logic - don't make them optional variables.
- Write a `README.md` for every module using terraform-docs to auto-generate input/output documentation.
- Test modules with Terratest or `tofu test` before releasing new versions.
- Keep modules focused - a module for an S3 bucket should not also create IAM policies. Compose modules at the root level.
