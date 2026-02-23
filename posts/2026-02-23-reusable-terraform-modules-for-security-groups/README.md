# How to Create Reusable Terraform Modules for Security Groups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, Security Groups, Networking

Description: Learn how to build a reusable Terraform module for AWS security groups with dynamic ingress and egress rules, CIDR management, and cross-module references.

---

Security groups are one of the most frequently created resources in AWS. Every EC2 instance, RDS database, Lambda function, and load balancer needs at least one. Without a proper module, you end up copy-pasting security group blocks across your codebase with slight variations, which makes auditing and updating rules a nightmare.

A well-designed security group module gives you a single place to enforce naming conventions, tagging standards, and default deny policies. This post walks through building one from scratch.

## The Problem with Inline Security Groups

Most teams start with inline security group definitions like this:

```hcl
# This works but doesn't scale - you'll copy-paste this everywhere
resource "aws_security_group" "web" {
  name_prefix = "web-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-sg"
  }
}
```

This is fine for a single security group. But when you have 50 services across 3 environments, you need something better.

## Module Directory Structure

Start with a clean directory layout:

```
modules/security-group/
  main.tf          # Security group resource and rules
  variables.tf     # Input variables
  outputs.tf       # Exported values
  versions.tf      # Provider constraints
```

## Defining the Variables

The variables file is where most of the design thinking happens. You need to balance flexibility with simplicity.

```hcl
# modules/security-group/variables.tf

variable "name" {
  description = "Name of the security group"
  type        = string
}

variable "description" {
  description = "Description of the security group's purpose"
  type        = string
  default     = "Managed by Terraform"
}

variable "vpc_id" {
  description = "VPC ID where the security group will be created"
  type        = string
}

# Dynamic ingress rules - each rule is a map with port, protocol, and source
variable "ingress_rules" {
  description = "List of ingress rules"
  type = list(object({
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = optional(list(string), [])
    security_groups = optional(list(string), [])
    description     = optional(string, "")
  }))
  default = []
}

# Dynamic egress rules - defaults to allow all outbound
variable "egress_rules" {
  description = "List of egress rules"
  type = list(object({
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = optional(list(string), [])
    security_groups = optional(list(string), [])
    description     = optional(string, "")
  }))
  default = [{
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }]
}

variable "tags" {
  description = "Additional tags to apply"
  type        = map(string)
  default     = {}
}
```

Using `optional()` with defaults keeps the caller's code clean. They only need to specify what matters.

## Building the Main Resource

The main.tf file uses `aws_security_group_rule` resources instead of inline rules. This is important because inline rules and standalone rules conflict with each other, and standalone rules are more flexible.

```hcl
# modules/security-group/main.tf

resource "aws_security_group" "this" {
  name_prefix = "${var.name}-"
  description = var.description
  vpc_id      = var.vpc_id

  # Using name_prefix instead of name avoids conflicts during replacement
  # Terraform creates the new SG before destroying the old one

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )

  # Prevent destruction before replacement is ready
  lifecycle {
    create_before_destroy = true
  }
}

# Create individual ingress rules from the list
resource "aws_security_group_rule" "ingress" {
  count = length(var.ingress_rules)

  type              = "ingress"
  security_group_id = aws_security_group.this.id

  from_port   = var.ingress_rules[count.index].from_port
  to_port     = var.ingress_rules[count.index].to_port
  protocol    = var.ingress_rules[count.index].protocol
  description = var.ingress_rules[count.index].description

  # Use cidr_blocks if specified, otherwise use security_groups
  cidr_blocks              = length(var.ingress_rules[count.index].cidr_blocks) > 0 ? var.ingress_rules[count.index].cidr_blocks : null
  source_security_group_id = length(var.ingress_rules[count.index].security_groups) > 0 ? var.ingress_rules[count.index].security_groups[0] : null
}

# Create individual egress rules
resource "aws_security_group_rule" "egress" {
  count = length(var.egress_rules)

  type              = "egress"
  security_group_id = aws_security_group.this.id

  from_port   = var.egress_rules[count.index].from_port
  to_port     = var.egress_rules[count.index].to_port
  protocol    = var.egress_rules[count.index].protocol
  description = var.egress_rules[count.index].description

  cidr_blocks              = length(var.egress_rules[count.index].cidr_blocks) > 0 ? var.egress_rules[count.index].cidr_blocks : null
  source_security_group_id = length(var.egress_rules[count.index].security_groups) > 0 ? var.egress_rules[count.index].security_groups[0] : null
}
```

## Outputs

Expose everything callers might need:

```hcl
# modules/security-group/outputs.tf

output "id" {
  description = "The ID of the security group"
  value       = aws_security_group.this.id
}

output "arn" {
  description = "The ARN of the security group"
  value       = aws_security_group.this.arn
}

output "name" {
  description = "The name of the security group"
  value       = aws_security_group.this.name
}
```

## Using the Module

Here is how callers use the module for common scenarios:

```hcl
# Web server security group - public facing
module "web_sg" {
  source = "./modules/security-group"

  name        = "web-server"
  description = "Security group for web servers"
  vpc_id      = module.vpc.id

  ingress_rules = [
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS from anywhere"
    },
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP from anywhere (redirect to HTTPS)"
    }
  ]

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}

# Database security group - only accessible from web servers
module "db_sg" {
  source = "./modules/security-group"

  name        = "database"
  description = "Security group for RDS instances"
  vpc_id      = module.vpc.id

  ingress_rules = [
    {
      from_port       = 5432
      to_port         = 5432
      protocol        = "tcp"
      security_groups = [module.web_sg.id]
      description     = "PostgreSQL from web servers"
    }
  ]

  tags = {
    Environment = "production"
    Team        = "data"
  }
}
```

## Adding Preset Rule Sets

One useful pattern is adding common rule presets so callers don't have to remember port numbers:

```hcl
# In a separate locals block or in the module itself
locals {
  # Predefined rule sets for common use cases
  preset_rules = {
    http = {
      from_port = 80
      to_port   = 80
      protocol  = "tcp"
    }
    https = {
      from_port = 443
      to_port   = 443
      protocol  = "tcp"
    }
    ssh = {
      from_port = 22
      to_port   = 22
      protocol  = "tcp"
    }
    postgresql = {
      from_port = 5432
      to_port   = 5432
      protocol  = "tcp"
    }
    mysql = {
      from_port = 3306
      to_port   = 3306
      protocol  = "tcp"
    }
    redis = {
      from_port = 6379
      to_port   = 6379
      protocol  = "tcp"
    }
  }
}
```

This lets you add a variable like `preset_ingress` that takes a list of strings like `["https", "ssh"]` and automatically expands them into full rules.

## Handling Security Group Cycles

One tricky issue with security groups is circular references. Service A needs to talk to Service B, and Service B needs to talk to Service A. You cannot reference both security groups in each other's module calls because Terraform would see a cycle.

The solution is to create the security groups first without cross-references, then add the cross-referencing rules separately:

```hcl
# Create both security groups without cross-references
module "service_a_sg" {
  source = "./modules/security-group"
  name   = "service-a"
  vpc_id = module.vpc.id
  # No ingress rules referencing service_b yet
}

module "service_b_sg" {
  source = "./modules/security-group"
  name   = "service-b"
  vpc_id = module.vpc.id
  # No ingress rules referencing service_a yet
}

# Add cross-reference rules after both SGs exist
resource "aws_security_group_rule" "a_from_b" {
  type                     = "ingress"
  security_group_id        = module.service_a_sg.id
  source_security_group_id = module.service_b_sg.id
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
}

resource "aws_security_group_rule" "b_from_a" {
  type                     = "ingress"
  security_group_id        = module.service_b_sg.id
  source_security_group_id = module.service_a_sg.id
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
}
```

## Version Constraints

Lock down the provider version so the module behaves consistently:

```hcl
# modules/security-group/versions.tf
terraform {
  required_version = ">= 1.3"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

## Summary

A reusable security group module saves you from scattered, inconsistent firewall rules across your infrastructure. The key design decisions are: use `name_prefix` with `create_before_destroy` for zero-downtime replacements, use standalone rules instead of inline rules, and provide sensible defaults for egress. For more on structuring Terraform modules, check out our post on [developing Terraform modules with best practices](https://oneuptime.com/blog/post/2026-02-23-develop-terraform-modules-with-best-practices/view).
