# How to Use the OpenTofu HCL Syntax Quick Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Syntax, Quick Reference, Infrastructure as Code

Description: A comprehensive quick reference for OpenTofu HCL syntax covering all block types, expressions, and language constructs.

## Introduction

HCL (HashiCorp Configuration Language) is the declarative language used in OpenTofu. This quick reference covers all major syntax elements for day-to-day configuration writing.

## Block Types

```hcl
# Resource block

resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-unique-bucket-name"
}

# Data source block
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
}

# Variable block
variable "environment" {
  type        = string
  description = "Target environment"
  default     = "dev"
}

# Output block
output "bucket_arn" {
  value       = aws_s3_bucket.my_bucket.arn
  description = "ARN of the S3 bucket"
}

# Local values
locals {
  name_prefix = "${var.app_name}-${var.environment}"
}

# Module call
module "vpc" {
  source = "./modules/vpc"
  cidr   = var.vpc_cidr
}

# Provider configuration
provider "aws" {
  region = var.aws_region
}

# Terraform/backend settings
terraform {
  required_version = ">= 1.8"
  backend "s3" { ... }
}
```

## String Interpolation

```hcl
# Template string
name = "app-${var.environment}-${var.region}"

# Multi-line heredoc
description = <<-EOT
  This is a multi-line
  description for ${var.app_name}
EOT

# Jsonencode for inline JSON
policy = jsonencode({
  Version = "2012-10-17"
  Statement = [...]
})
```

## for_each and count

```hcl
# for_each with a set (converted from a list)
resource "aws_s3_bucket" "env" {
  for_each = toset(["dev", "staging", "prod"])
  bucket   = "myapp-${each.key}"
}

# for_each with a set of CIDRs
resource "aws_security_group_rule" "ingress" {
  for_each          = var.allowed_cidrs
  type              = "ingress"
  security_group_id = aws_security_group.app.id
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [each.value]
}

# count
resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = var.ami_id
  instance_type = "t3.micro"
}
# Reference: aws_instance.web[0], aws_instance.web[1]
```

## Conditional Expressions

```hcl
# Ternary
instance_type = var.environment == "prod" ? "m5.large" : "t3.micro"

# Count-based conditional
count = var.create_bucket ? 1 : 0

# enabled meta-argument (OpenTofu 1.11+) - must be inside a lifecycle block
resource "aws_instance" "example" {
  # ...
  lifecycle {
    enabled = var.enable_feature
  }
}
```

## for Expressions

```hcl
# List transformation
upper_names = [for name in var.names : upper(name)]

# Map transformation
bucket_arns = {for k, v in aws_s3_bucket.env : k => v.arn}

# Filtering
even_numbers = [for n in range(10) : n if n % 2 == 0]

# Map to list
subnet_ids = [for s in aws_subnet.private : s.id]
```

## Dynamic Blocks

```hcl
resource "aws_security_group" "app" {
  name = "app-sg"

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidrs
    }
  }
}
```

## Type Constraints

```hcl
# Each variable accepts exactly one type. Examples:

variable "example_string" { type = string }       # string
variable "example_number" { type = number }       # number
variable "example_bool"   { type = bool }         # boolean
variable "example_list"   { type = list(string) } # list of strings
variable "example_set"    { type = set(string) }  # set (no duplicates)
variable "example_map"    { type = map(string) }  # map with string values

variable "example_object" {                       # object with specific shape
  type = object({
    name = string
    port = number
  })
}

variable "example_any"    { type = any }          # any type
```

## Summary

HCL's block-based syntax with interpolation, for_each, dynamic blocks, and type constraints gives you a powerful declarative language for infrastructure. Use locals to name complex expressions, for_each over count for resources that use maps, and dynamic blocks for variable-length nested configuration like ingress rules. The `tofu fmt` command auto-formats HCL to the standard style.
