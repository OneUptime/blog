# How to Debug Module Reference Errors in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Module, Error, Debugging, Infrastructure as Code

Description: Learn how to diagnose and fix module reference errors in OpenTofu, including undefined outputs, missing variables, and incorrect module call syntax.

## Introduction

Module reference errors occur when a calling module accesses an output that the child module does not export, passes a variable that is not declared, or uses the wrong syntax to reference module outputs. These errors are caught during `tofu validate` and `tofu plan`.

## Common Module Reference Errors

```hcl
Error: Unsupported attribute
  on main.tf line 25, in resource "aws_instance" "web":
  25:   subnet_id = module.vpc.subnet_id
  This object does not have an attribute named "subnet_id".

Error: Missing required argument
  on main.tf line 12, in module "vpc":
  The argument "vpc_cidr" is required, but no definition was found.

Error: Unsupported argument
  on main.tf line 14, in module "vpc":
  14:   extra_arg = "value"
  An argument named "extra_arg" is not expected here.
```

## Fix 1: Missing Output in Child Module

The most common module reference error - the calling module references an output that doesn't exist:

```hcl
# module/vpc/outputs.tf - add the missing output

output "subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "vpc_id" {
  value = aws_vpc.main.id
}
```

```hcl
# main.tf - calling module
module "vpc" {
  source = "./modules/vpc"
  cidr   = "10.0.0.0/16"
}

resource "aws_instance" "app" {
  # CORRECT - matches output name in modules/vpc/outputs.tf
  subnet_id = module.vpc.subnet_ids[0]
}
```

## Fix 2: Missing Required Variable in Child Module

```hcl
# modules/vpc/variables.tf
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}
```

```hcl
# main.tf - must pass all required variables
module "vpc" {
  source      = "./modules/vpc"
  vpc_cidr    = "10.0.0.0/16"
  environment = "prod"   # Don't forget required variables
}
```

## Fix 3: Passing Undefined Variable to Module

```hcl
# WRONG - module/vpc doesn't declare extra_arg
module "vpc" {
  source    = "./modules/vpc"
  vpc_cidr  = "10.0.0.0/16"
  extra_arg = "value"   # Error: not declared in the module
}

# CORRECT - only pass declared variables
module "vpc" {
  source   = "./modules/vpc"
  vpc_cidr = "10.0.0.0/16"
}
```

## Fix 4: Wrong Module Output Syntax

```hcl
# WRONG - module output syntax
resource "aws_ecs_service" "app" {
  # Incorrect ways to reference module output
  cluster = vpc.module.cluster_id       # Wrong order
  cluster = module_vpc.cluster_id       # Wrong - underscore not dot
}

# CORRECT - module.<module_name>.<output_name>
resource "aws_ecs_service" "app" {
  cluster = module.vpc.cluster_id
}
```

## Fix 5: Accessing Nested Module Outputs

```hcl
# If you have nested modules (module calling a module)
module "infrastructure" {
  source = "./modules/infrastructure"
}

# Access nested module outputs via the parent module
resource "aws_instance" "app" {
  # Access infrastructure.vpc.subnet_id via the infrastructure module output
  subnet_id = module.infrastructure.vpc_subnet_id  # Exposed in infrastructure/outputs.tf
}
```

```hcl
# modules/infrastructure/outputs.tf - must re-export nested module outputs
output "vpc_subnet_id" {
  value = module.vpc.subnet_ids[0]
}
```

## Debugging with tofu validate

```bash
# Validate catches all reference errors without making API calls
tofu validate

# After fixing, run plan to confirm
tofu plan
```

## Conclusion

Module reference errors are resolved by ensuring all referenced outputs exist in the child module's `outputs.tf`, all required variables are passed from the calling module, and the `module.<name>.<output>` syntax is used correctly. Use `tofu validate` to catch these errors quickly without network calls.
