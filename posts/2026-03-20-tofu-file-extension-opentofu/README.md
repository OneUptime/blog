# How to Use the .tofu File Extension in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, .tofu Extension, HCL, Infrastructure as Code, DevOps

Description: A guide to using OpenTofu's native .tofu file extension, which takes precedence over .tf files when both exist.

## Introduction

OpenTofu 1.8 and later support a native `.tofu` file extension in addition to the standard `.tf` extension. The `.tofu` extension was introduced to allow OpenTofu-specific configurations that won't be processed by Terraform, enabling organizations to maintain separate configurations for each tool.

## The .tofu File Extension

Files with the `.tofu` extension are processed identically to `.tf` files but with one key behavior: if a `.tofu` file and a `.tf` file have the same base name (e.g., `main.tofu` and `main.tf`), the `.tofu` file takes precedence and the `.tf` file is ignored.

## Basic Usage

```hcl
# main.tofu - OpenTofu-specific configuration

# This file will only be processed by OpenTofu, not Terraform

terraform {
  required_version = ">= 1.8.0"

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

resource "aws_s3_bucket" "data" {
  bucket = "${var.project_name}-data-${var.environment}"

  tags = {
    ManagedBy = "OpenTofu"
  }
}
```

## Override Use Case

The primary use case is overriding `.tf` files with OpenTofu-specific configurations:

```hcl
# versions.tf - Original Terraform configuration
terraform {
  required_version = ">= 1.5.0"  # Terraform version

  # Terraform-specific backend
  backend "remote" {
    organization = "my-org"
    workspaces {
      name = "my-workspace"
    }
  }
}
```

```hcl
# versions.tofu - OpenTofu override
# This replaces versions.tf when running with OpenTofu

terraform {
  required_version = ">= 1.8.0"  # OpenTofu version

  # OpenTofu uses S3 backend instead of Terraform Cloud
  backend "s3" {
    bucket = "my-opentofu-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# When running tofu commands, versions.tofu is used
# When running terraform commands, versions.tf is used
tofu init   # Uses versions.tofu (S3 backend)
# terraform init  # Would use versions.tf (remote backend)
```

## Migrating from Terraform to OpenTofu

```bash
# Step 1: Copy existing .tf files to .tofu files for OpenTofu-specific changes
cp versions.tf versions.tofu

# Step 2: Edit versions.tofu for OpenTofu specifics
# - Change required_version to match OpenTofu versioning
# - Change backend if using OpenTofu-specific state
# - Add OpenTofu-specific features

# Step 3: The .tofu file takes precedence
# OpenTofu uses: versions.tofu
# Terraform uses: versions.tf
```

## Directory Structure with .tofu Files

```text
project/
├── main.tf         # Shared configuration (used by both)
├── variables.tf    # Shared variables
├── outputs.tf      # Shared outputs
├── versions.tf     # Terraform-specific versions
├── versions.tofu   # OpenTofu-specific versions (overrides versions.tf)
└── backends.tofu   # OpenTofu-specific backend (no .tf equivalent needed)
```

## Checking Which .tf Files Are Ignored

```bash
# Debug output can show .tf files ignored because a .tofu alternative exists
TF_LOG=DEBUG tofu validate 2>&1 | grep "\.tofu\|\.tf"
```

## When to Use .tofu vs .tf

```text
Use .tf when:
- Configuration works for both Terraform and OpenTofu
- You're not using OpenTofu-specific features
- You want to maintain compatibility

Use .tofu when:
- Using OpenTofu-specific features (state encryption, etc.)
- You want to override .tf files for OpenTofu only
- Migrating a project from Terraform to OpenTofu
```

## Conclusion

The `.tofu` file extension is a powerful tool for teams transitioning from Terraform to OpenTofu or maintaining parallel configurations for both tools. By using `.tofu` files that override their `.tf` counterparts, you can adopt OpenTofu-specific features gradually without breaking compatibility with existing Terraform workflows.
