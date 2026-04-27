# How to Follow OpenTofu Style Conventions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Style Guide, Best Practice, HCL, Infrastructure as Code, DevOps

Description: A guide to OpenTofu HCL style conventions for writing clean, consistent, and maintainable infrastructure code.

## Introduction

Consistent code style makes OpenTofu configurations easier to read, review, and maintain. OpenTofu has established style conventions that `tofu fmt` enforces for formatting, but there are also broader conventions for naming, organization, and structure that make your code more professional.

## Formatting Conventions (Enforced by tofu fmt)

```hcl
# Use 2-space indentation (tofu fmt handles this)

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  # Align equals signs for consecutive assignments
  # (tofu fmt does this automatically)
}
```

## Naming Conventions

### Resource Names

```hcl
# Use snake_case (underscores)
resource "aws_instance" "web_server" {}     # Good
resource "aws_instance" "webServer" {}      # Bad (camelCase)
resource "aws_instance" "web-server" {}     # Bad (hyphens)

# Use descriptive names
resource "aws_security_group" "web_server_http" {}  # Good
resource "aws_security_group" "sg1" {}              # Bad

# Use 'this' for single-resource modules
resource "aws_vpc" "this" {}

# Use 'main' or 'default' for primary resources
resource "aws_security_group" "main" {}
```

### Variable Names

```hcl
# Descriptive, snake_case names
variable "aws_region" {}          # Good
variable "awsRegion" {}           # Bad
variable "region" {}              # OK but less specific

# Noun-based names for values
variable "instance_type" {}       # Good
variable "set_instance_type" {}   # Bad (verb form)
```

### Output Names

```hcl
# Descriptive names matching the resource they describe
output "vpc_id" {}                # Good
output "vpc_id_output" {}         # Redundant 'output' suffix

# For modules, use descriptive names
output "instance_public_ip" {}
output "database_endpoint" {}
```

## Block Organization

```hcl
# Recommended order within a resource block:
resource "aws_instance" "web" {
  # 1. Required arguments first
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  # 2. Optional arguments
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id              = aws_subnet.public.id

  # 3. Nested blocks (with blank line separator)
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  # 4. Lifecycle blocks (near the end)
  lifecycle {
    create_before_destroy = true
  }

  # 5. Tags (last)
  tags = merge(
    local.common_tags,
    {
      Name = "web-server"
    }
  )
}
```

## File Organization Convention

```hcl
# versions.tf order:
# 1. terraform block with required_version
# 2. required_providers
# 3. backend configuration

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Comment Conventions

```hcl
# Use single-line comments for brief explanations
variable "environment" {
  type = string
  # Must be one of: dev, staging, prod
}

# Use multi-line for longer documentation
# This module creates a highly available web server cluster.
# It includes auto-scaling, load balancing, and monitoring.
# Prerequisites:
#   - A VPC with public and private subnets
#   - An ACM certificate for HTTPS
module "web_cluster" {
  source = "./modules/web-cluster"
}
```

## Tags Convention

```hcl
# Use locals for shared tags
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    Owner       = var.team_name
    ManagedBy   = "OpenTofu"
    Repository  = "github.com/org/infra"
  }
}

# Merge common tags with resource-specific tags
resource "aws_instance" "web" {
  # ...
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-web"
      Role = "web-server"
    }
  )
}
```

## Meta-Argument Order

```hcl
# Follow this order for meta-arguments within a resource:
resource "aws_instance" "web" {
  # 1. count/for_each (if applicable)
  count = var.instance_count

  # ... resource arguments ...

  # 2. depends_on (near the end)
  depends_on = [aws_iam_role_policy.web]

  # 3. lifecycle (near the end)
  lifecycle {
    create_before_destroy = true
  }
}
```

## Conclusion

Following OpenTofu style conventions makes your infrastructure code professional, readable, and maintainable. While `tofu fmt` handles formatting automatically, naming conventions, organization patterns, and commenting practices require deliberate attention. Consistent style across a team's codebase significantly reduces cognitive overhead during code reviews and makes onboarding new team members easier.
