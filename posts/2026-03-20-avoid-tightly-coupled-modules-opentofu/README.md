# How to Avoid Tightly Coupled Modules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Coupling, Best Practice, Architecture, Infrastructure as Code

Description: Learn how to design loosely coupled OpenTofu modules that are reusable across environments and teams by following good interface design principles.

## Introduction

Tightly coupled modules depend on specific implementation details of other modules, making them impossible to reuse in different contexts. When a module hardcodes assumptions about its environment - specific VPC CIDRs, fixed subnet naming conventions, or direct module-to-module data sharing - it becomes fragile and hard to maintain. This post shows how to design modules with clean, stable interfaces.

## What Tight Coupling Looks Like

Modules that reference other modules directly or assume specific structures.

```hcl
# BAD: modules/app/main.tf uses terraform_remote_state directly

data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-company-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  # Tightly coupled to networking module internals
  subnet_id = data.terraform_remote_state.networking.outputs.subnet_ids[0]
  vpc_security_group_ids = [
    data.terraform_remote_state.networking.outputs.app_security_group_id
  ]
}
# Problem: This module ONLY works with this specific networking module in this specific backend
```

## What Loose Coupling Looks Like

Pass all external values in through variables.

```hcl
# GOOD: modules/app/variables.tf
variable "subnet_id" {
  type        = string
  description = "Subnet ID where the application instances will be deployed"
}

variable "security_group_ids" {
  type        = list(string)
  description = "List of security group IDs to attach to instances"
}

# modules/app/main.tf - no external data sources
resource "aws_instance" "app" {
  subnet_id              = var.subnet_id
  vpc_security_group_ids = var.security_group_ids
  # ...
}
```

```hcl
# Root module wires the modules together
module "networking" {
  source = "./modules/networking"
}

module "app" {
  source = "./modules/app"

  # Values flow through variables, not direct coupling
  subnet_id          = module.networking.private_subnet_id
  security_group_ids = [module.networking.app_security_group_id]
}
```

## Designing Good Module Interfaces

A module's variables are its API - design them like a library interface.

```hcl
# BAD: Module assumes too much about the environment
variable "environment" {
  type = string
}

resource "aws_db_instance" "main" {
  instance_class     = var.environment == "prod" ? "db.m5.large" : "db.t3.micro"
  multi_az           = var.environment == "prod"
  # This module knows too much about your naming/sizing conventions
}

# GOOD: Module is told what to do, not what to infer
variable "instance_class" {
  type        = string
  description = "RDS instance type"
  default     = "db.t3.micro"
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment"
  default     = false
}

resource "aws_db_instance" "main" {
  instance_class = var.instance_class
  multi_az       = var.multi_az
}
```

## Avoid Deeply Nested Module Calls

Deep nesting creates hidden dependencies.

```hcl
# BAD: Module A calls Module B which calls Module C
# modules/a/main.tf
module "b" {
  source = "../b"
}

# modules/b/main.tf
module "c" {
  source = "../c"
}

# Debugging is a nightmare - where does the value come from?

# GOOD: Flat module structure, root module wires everything
module "networking" { source = "./modules/networking" }
module "cluster"    { source = "./modules/cluster"; vpc_id = module.networking.vpc_id }
module "app"        { source = "./modules/app"; subnet_id = module.cluster.subnet_id }
```

## Testing Loose Coupling

Loosely coupled modules are easy to test in isolation.

```hcl
# tests/app-module.tftest.hcl

mock_provider "aws" {}

# Test the app module with simple test inputs
variables {
  subnet_id          = "subnet-mock12345"
  security_group_ids = ["sg-mock67890"]
  instance_type      = "t3.micro"
}

run "creates_instance_in_correct_subnet" {
  command = plan

  assert {
    condition     = aws_instance.app.subnet_id == "subnet-mock12345"
    error_message = "Instance should be in the specified subnet"
  }
}
```

## Summary

Tightly coupled modules hard-code assumptions about their environment and cannot be reused across different contexts. Loosely coupled modules accept all external values through well-defined variables and have no hidden dependencies. Design module interfaces like library APIs: accept what you need through variables, return what callers need through outputs, and never reach outside your own scope for data. Loose coupling also makes modules independently testable with mock providers and synthetic variable values.
