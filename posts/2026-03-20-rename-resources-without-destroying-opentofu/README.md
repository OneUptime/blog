# How to Rename Resources Without Destroying Them in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Moved Blocks, State Management, Refactoring, HCL

Description: Learn how to rename OpenTofu resources and modules using the moved block without destroying and recreating infrastructure, enabling safe HCL refactoring.

## Introduction

Renaming a resource in HCL without telling OpenTofu about the rename causes it to plan a destroy of the old resource and create of the new one. The `moved` block (introduced in Terraform 1.1 and supported by OpenTofu) lets you declare the rename declaratively, preserving the existing resource.

## Renaming a Resource

```hcl
# BEFORE: resource was named "main"

# resource "aws_s3_bucket" "main" { ... }

# AFTER: renamed to "app_assets"
resource "aws_s3_bucket" "app_assets" {
  bucket = "my-app-assets"
}

# Tell OpenTofu that "main" was renamed to "app_assets"
# This prevents destroy+create
moved {
  from = aws_s3_bucket.main
  to   = aws_s3_bucket.app_assets
}
```

## Moving Into a Module

When you extract resources into a module, use `moved` to avoid recreation.

```hcl
# BEFORE: resource existed at root level
# resource "aws_vpc" "main" { ... }

# AFTER: resource moved into the networking module
module "networking" {
  source = "./modules/networking"
  # ...
}

# Tell OpenTofu the root resource is now inside the module
moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.main
}
```

## Renaming a Module

```hcl
# BEFORE: module was named "vpc"
# module "vpc" { source = "./modules/vpc"; ... }

# AFTER: renamed to "networking"
module "networking" {
  source = "./modules/vpc"
  # same configuration
}

# Declare the rename
moved {
  from = module.vpc
  to   = module.networking
}
```

## Moving Resources in for_each Modules

When a module gains `for_each`, move existing resources to the new keyed address.

```hcl
# BEFORE: single module instance
# module "env_stack" { source = "./modules/app-stack"; ... }

# AFTER: multiple instances with for_each
module "env_stack" {
  for_each = toset(["dev", "prod"])
  source   = "./modules/app-stack"
  # ...
}

# Move the previously single instance to the "prod" key
moved {
  from = module.env_stack
  to   = module.env_stack["prod"]
}
```

## Moving from count to for_each

```hcl
# BEFORE: two instances using count
# resource "aws_subnet" "private" { count = 2; ... }

# AFTER: using for_each with AZ names
resource "aws_subnet" "private" {
  for_each = toset(["us-east-1a", "us-east-1b"])
  # ...
}

moved {
  from = aws_subnet.private[0]
  to   = aws_subnet.private["us-east-1a"]
}

moved {
  from = aws_subnet.private[1]
  to   = aws_subnet.private["us-east-1b"]
}
```

## Cleaning Up moved Blocks

`moved` blocks are generally best kept in configuration to preserve the upgrade path for later applies. Only remove them when you are certain all private environments have already applied the change, because removing a `moved` block is generally a breaking change.

```bash
# Verify plan shows no destroy/create from the moved blocks
tofu plan
# Output should say: 0 to add, 0 to change, 0 to destroy
# (just the moves, which are zero-cost operations)
```

## Conclusion

The `moved` block is the safe way to refactor HCL without touching real infrastructure. Always add `moved` blocks when renaming resources, extracting to modules, or refactoring module hierarchies. Run `tofu plan` to confirm the moves result in zero changes before applying.
