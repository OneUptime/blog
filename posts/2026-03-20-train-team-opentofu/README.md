# How to Train Your Team to Use OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Team Training, Migration, Infrastructure as Code, DevOps, Onboarding

Description: Learn how to train your engineering team to adopt OpenTofu - covering learning paths for Terraform users, hands-on labs, documentation updates, and building internal expertise.

## Introduction

For teams already using Terraform, adopting OpenTofu is mostly about familiarity with the new binary name and understanding what's different. For teams new to IaC, OpenTofu is an excellent starting point. A structured training approach reduces friction and builds team confidence quickly.

## Training Path for Terraform Users

For engineers with Terraform experience, the transition is minimal:

```text
Week 1: Conceptual differences
  - Why OpenTofu exists (MPL 2.0 fork vs BSL)
  - What's the same: HCL syntax, state format, providers, modules
  - What's new: OpenTofu-specific provider iteration and 1.11+ write-only attributes
  - Hands-on: Run tofu plan on existing Terraform configs

Week 2: New features in OpenTofu
  - Write-only attributes and ephemeral resources (1.11+)
  - Native state encryption
  - Provider iteration with for_each
  - Lab: Implement write-only password for a database resource

Week 3: CI/CD updates
  - Replace setup-terraform with setup-opentofu in GitHub Actions
  - Update Atlantis configuration
  - Regenerate .terraform.lock.hcl
  - Lab: Update a sample pipeline from Terraform to OpenTofu
```

## Training Path for IaC Beginners

```text
Week 1-2: IaC fundamentals
  - What is infrastructure as code and why it matters
  - HCL syntax: blocks, arguments, expressions
  - Hands-on: Deploy a VPC and EC2 instance with OpenTofu
  - Lab exercises: variables, locals, outputs

Week 3-4: State management
  - What state files are and why they matter
  - Remote backends (S3, Azure Storage, GCS)
  - State locking and concurrent access
  - Lab: Set up S3+DynamoDB backend

Week 5-6: Modules and best practices
  - Module structure and reuse
  - Using public registry modules
  - Writing your first module
  - Lab: Refactor a flat config into modules

Week 7-8: CI/CD integration
  - PR-based workflows with GitHub Actions
  - Plan review and approval gates
  - Linting with TFLint and security scanning with Checkov
  - Lab: Build a complete CI/CD pipeline
```

## Hands-On Lab: First OpenTofu Deployment

```hcl
# lab/01-first-deployment/main.tf

# Lab goal: Deploy an S3 bucket with versioning and tags

terraform {
  required_version = ">= 1.8"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region"    { default = "us-east-1" }
variable "environment"   { default = "lab" }
variable "student_name"  { type = string }

resource "aws_s3_bucket" "lab" {
  # Each student gets their own unique bucket
  bucket = "tofu-lab-${var.student_name}-${random_id.suffix.hex}"

  tags = {
    Environment = var.environment
    Student     = var.student_name
  }
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "lab" {
  bucket = aws_s3_bucket.lab.id
  versioning_configuration { status = "Enabled" }
}

output "bucket_name" {
  value = aws_s3_bucket.lab.id
}
```

Lab instructions:
```bash
# 1. Initialize
tofu init

# 2. Plan - review what will be created
tofu plan -var="student_name=yourname"

# 3. Apply
tofu apply -var="student_name=yourname"

# 4. View state
tofu show

# 5. Clean up
tofu destroy -var="student_name=yourname"
```

## Internal Documentation Updates

Update team runbooks and wikis:

```markdown
# Infrastructure Runbook

## Binary
Use `tofu` (not `terraform`) for all infrastructure operations.

## Quick Reference: Command Changes
| Old (Terraform) | New (OpenTofu) |
|----------------|----------------|
| terraform init | tofu init |
| terraform plan | tofu plan |
| terraform apply | tofu apply |
| terraform destroy | tofu destroy |
| terraform state | tofu state |
| terraform import | tofu import |

## CI/CD
All pipelines use `opentofu/setup-opentofu@v2` GitHub Action.
See `.github/workflows/opentofu.yml` for the canonical pipeline.

## Version
Current OpenTofu version: 1.11.x (pinned in `.tool-versions`)
```

## `.tool-versions` for Version Management

```text
# .tool-versions (asdf version manager)
opentofu 1.11.6
```

```bash
# Team members install the pinned version
asdf plugin add opentofu
asdf install opentofu 1.11.6
asdf local opentofu 1.11.6

# Verify
tofu version
# OpenTofu v1.11.6
```

## Conclusion

Training a Terraform team to use OpenTofu is low-effort - the core concepts and most existing Terraform syntax are compatible. Focus on: the binary name change, the new registry, lock file regeneration, and CI/CD pipeline updates. For IaC beginners, use the same OpenTofu learning resources as you would for Terraform, focusing on the `tofu` command. Pin the OpenTofu version with `.tool-versions` and update team runbooks with the command reference table.
