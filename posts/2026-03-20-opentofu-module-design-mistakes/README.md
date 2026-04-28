# How to Avoid Common Module Design Mistakes in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Module

Description: Learn the most common OpenTofu module design mistakes and how to avoid them to build maintainable, reusable infrastructure modules.

## Introduction

Poorly designed modules are hard to reuse, difficult to test, and create painful upgrade paths. Understanding the most common mistakes helps you build modules that age well and serve multiple consumers without modification.

## Mistake 1: Too Many Responsibilities

A module that creates a VPC, EKS cluster, RDS instance, and monitoring stack in one block is difficult to reuse independently.

```hcl
# Bad - one module does everything

module "entire_stack" {
  source = "./modules/everything"
  # Impossible to use just the networking part
}

# Good - single-responsibility modules
module "networking" { source = "./modules/vpc" }
module "cluster"    { source = "./modules/eks" }
module "database"   { source = "./modules/rds" }
```

## Mistake 2: Hard-Coded Values

```hcl
# Bad - hard-coded bucket name
resource "aws_iam_role_policy" "this" {
  policy = jsonencode({
    Resource = "arn:aws:s3:::my-company-bucket"  # Hard-coded bucket name
  })
}

# Good - parameterize everything that changes
variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket to grant access to"
}

resource "aws_iam_role_policy" "this" {
  policy = jsonencode({
    Resource = "arn:aws:s3:::${var.bucket_name}"
  })
}
```

## Mistake 3: Missing or Incorrect Output Declarations

```hcl
# Bad - caller cannot reference the created resource
resource "aws_vpc" "this" {
  cidr_block = var.cidr_block
}
# No outputs - callers cannot get the vpc_id

# Good - expose everything a caller needs
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.this.cidr_block
}
```

## Mistake 4: No Variable Descriptions or Types

```hcl
# Bad - no type, no description
variable "settings" {}

# Good - typed, documented, validated
variable "instance_type" {
  type        = string
  description = "EC2 instance type. Must be from the t3 or m5 family."

  validation {
    condition     = contains(["t3.micro", "t3.small", "m5.large"], var.instance_type)
    error_message = "instance_type must be t3.micro, t3.small, or m5.large."
  }
}
```

## Mistake 5: Configuring Providers Inside Modules

```hcl
# Bad - provider configuration belongs in the root module
provider "aws" {
  region = "us-east-1"  # Never do this in a child module
}

# Good - accept providers via required_providers and let the root configure them
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

## Mistake 6: Not Including Examples

Without examples, callers must guess how to invoke your module:

```text
# Good module structure includes examples
terraform-aws-vpc/
├── main.tf
├── variables.tf
├── outputs.tf
└── examples/
    ├── basic/main.tf      - Minimal working example
    └── complete/main.tf   - Full-featured example
```

## Mistake 7: Ignoring Backwards Compatibility

Removing a variable or renaming an output in a new version breaks all callers:

```hcl
# Prefer adding new optional variables over removing old ones
# If you must make a breaking change, bump the major version
# and document the migration path in CHANGELOG.md

# Version 1.x had: output "subnet_id"
# Version 2.x should keep it as an alias if renamed
output "subnet_id" {
  description = "Deprecated: use private_subnet_ids instead"
  value       = aws_subnet.private[0].id
}
```

## Conclusion

The most impactful module design improvements are: single responsibility, full parameterization, comprehensive outputs, typed and documented variables, and not configuring providers inside modules. Avoid these common mistakes from the start to save significant refactoring effort as your module library grows.
