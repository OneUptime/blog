# How to Use the .tf File Extension in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, File Extensions, Infrastructure as Code, DevOps

Description: A guide to using .tf files in OpenTofu projects, including file organization, naming conventions, and best practices.

## Introduction

OpenTofu can use files with the `.tf` extension to store HCL (HashiCorp Configuration Language) configurations. It also supports `.tofu` files, but this guide focuses on `.tf` files. Understanding how OpenTofu loads and processes these files is fundamental to organizing your infrastructure code effectively.

## How OpenTofu Reads .tf Files

OpenTofu normally reads **all** top-level `.tf` files in a module directory when you run configuration commands such as `tofu plan` or `tofu apply`. The order of normal configuration files doesn't matter - OpenTofu merges all configurations together:

If a `.tf` file and a `.tofu` file have the same base name in the same directory, OpenTofu loads the `.tofu` file and ignores the `.tf` file.

```bash
# All these files are read together

ls *.tf
# main.tf
# variables.tf
# outputs.tf
# locals.tf
# networking.tf
# compute.tf
```

## Standard .tf Files

```hcl
# main.tf - Primary infrastructure resources
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

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

```hcl
# variables.tf - All input variables
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
}
```

```hcl
# outputs.tf - All output values
output "vpc_id" {
  value = aws_vpc.main.id
}
```

```hcl
# locals.tf - All local values
locals {
  name_prefix = "app-${var.environment}"
  common_tags = {
    Environment = var.environment
    ManagedBy   = "OpenTofu"
  }
}
```

## Organizing Large Configurations

```text
project/
├── main.tf           # Core resources
├── variables.tf      # All variables
├── outputs.tf        # All outputs
├── locals.tf         # All locals
├── versions.tf       # OpenTofu + provider versions
├── networking.tf     # VPC, subnets, route tables
├── compute.tf        # EC2 instances, ASGs
├── security.tf       # Security groups, IAM
├── database.tf       # RDS, DynamoDB
└── monitoring.tf     # CloudWatch, alarms
```

## Split Variables File

```hcl
# variables-networking.tf
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

# variables-compute.tf
variable "instance_type" {
  type    = string
  default = "t3.micro"
}
```

## What NOT to Do

```bash
# Avoid files that cause surprises:
# - Avoid spaces in file names because shell commands need quoting
# - Don't keep backup files that still end in .tf, such as main.backup.tf
# - Keep each .tf file focused on a specific concern
```

## Referencing Across Files

OpenTofu merges normal top-level `.tf` files in a module directory, so resources defined in different files can reference each other freely:

```hcl
# networking.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# security.tf - Can reference resources from networking.tf
resource "aws_security_group" "web" {
  name   = "web"
  vpc_id = aws_vpc.main.id  # Defined in networking.tf
}
```

## Viewing All .tf Files

```bash
# List all .tf files in the current directory
ls *.tf

# Find all .tf files recursively
find . -name "*.tf" -not -path "./.terraform/*"

# Count .tf files
find . -name "*.tf" -not -path "./.terraform/*" | wc -l
```

## Conclusion

The `.tf` file extension is supported for OpenTofu HCL configurations. OpenTofu merges normal top-level `.tf` files in a module directory, giving you flexibility to organize code across multiple files by concern. Follow the convention of separating variables, outputs, locals, and resources into dedicated files for better readability and maintainability.
