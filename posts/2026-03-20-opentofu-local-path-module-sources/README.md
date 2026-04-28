# How to Use Local Path Module Sources in OpenTofu - Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Module

Description: Learn how to use local filesystem paths as module sources in OpenTofu for referencing modules stored alongside your configuration.

## What are Local Path Module Sources?

Local path module sources let you reference a module stored on the local filesystem. This is the simplest way to reuse modules within the same repository, reference shared modules in a monorepo, or test modules you are actively developing.

## Syntax

```hcl
module "name" {
  source = "./path/to/module"
  # ...
}
```

The path must start with `./` or `../` to be recognized as a local path.

## Basic Usage

```hcl
# Reference a module in a subdirectory

module "vpc" {
  source = "./modules/vpc"

  name       = "production"
  cidr_block = "10.0.0.0/16"
}

# Reference a module in a parent directory
module "shared_security" {
  source = "../shared/modules/security"

  vpc_id = module.vpc.vpc_id
}
```

## Monorepo Structure

Local paths are ideal for monorepos where multiple applications share infrastructure modules:

```text
infrastructure/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── rds/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   └── main.tf    ← calls modules with source = "../../modules/..."
│   └── prod/
│       └── main.tf    ← same modules, different inputs
```

```hcl
# environments/prod/main.tf
module "network" {
  source = "../../modules/vpc"

  name       = "prod"
  cidr_block = "10.0.0.0/16"
  az_count   = 3
}

module "database" {
  source = "../../modules/rds"

  vpc_id          = module.network.vpc_id
  subnet_ids      = module.network.private_subnet_ids
  instance_class  = "db.m5.large"
}
```

## No Version Pinning Required

Unlike registry or Git sources, local path modules do not support or require version constraints.

```hcl
# Local path modules use the exact files on disk - no version needed
module "security_groups" {
  source = "./modules/security"

  vpc_id      = var.vpc_id
  environment = var.environment
  # Note: no `version` argument - not supported for local paths
}
```

## Re-initialization Not Required

When you change local module code, you do not need to run `tofu init` again - the changes are picked up on the next `tofu plan`. This makes local modules ideal for rapid development.

## Important Notes

- The path must start with `./` or `../`. A path without these prefixes is treated as a registry module, not a local path.
- Local modules do not support version constraints.
- When you move to sharing modules across repositories, switch to Git-based or registry sources.
- `tofu init` records local module references in `.terraform/modules/modules.json` (the files themselves are read in place from disk, not copied) - re-run it if you add, remove, or change a module's `source` address.

## Conclusion

Local path module sources are the simplest and fastest way to organize reusable infrastructure within a single repository. They require no version management, no external hosting, and no re-initialization when you change module code, making them perfect for active development and monorepo patterns.
