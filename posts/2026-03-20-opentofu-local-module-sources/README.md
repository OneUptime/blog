# How to Use Local Path Module Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Module

Description: Learn how to reference local directory modules in OpenTofu using relative paths for monorepo-style infrastructure organization.

## Introduction

Local path module sources allow you to reference modules stored in the same repository as your root configuration. This is the simplest module source and is commonly used in monorepo-style projects where all infrastructure code lives together.

## Syntax

```hcl
module "example" {
  source = "./path/to/module"
  # or
  source = "../sibling-module"
  # or
  source = "../../shared/modules/vpc"
}
```

- Path must start with `./` or `../`
- The path is relative to the calling module's directory
- Local modules are not copied; OpenTofu references them directly from the source location

## Project Structure Example

```text
infrastructure/
├── environments/
│   ├── dev/
│   │   └── main.tf         # Uses modules via ../..
│   └── prod/
│       └── main.tf
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ec2/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── rds/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── shared/
    └── security-groups/
        ├── main.tf
        └── outputs.tf
```

## Using Local Modules

```hcl
# environments/prod/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Reference modules with relative paths

module "vpc" {
  source = "../../modules/vpc"

  cidr_block   = "10.0.0.0/16"
  az_count     = 3
  environment  = "prod"
}

module "web_servers" {
  source = "../../modules/ec2"

  name               = "web"
  instance_type      = "m5.large"
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = module.security_groups.web_sg_ids
  environment        = "prod"
}

module "database" {
  source = "../../modules/rds"

  identifier     = "prod-db"
  instance_class = "db.r5.large"
  subnet_ids     = module.vpc.private_subnet_ids
  environment    = "prod"
}
```

## Advantages of Local Modules

1. **No versioning overhead** - changes take effect immediately
2. **Easy debugging** - edit module code without publishing
3. **Monorepo-friendly** - all code in one repository
4. **Fast iteration** - no `tofu init` needed for module code changes

## Limitations

- Cannot pin specific versions
- Sharing across repositories requires copying code
- CI/CD must check out the whole repository

## Step-by-Step Usage

1. Create the module directory under `modules/`.
2. Write `variables.tf`, `main.tf`, `outputs.tf`.
3. Reference with `source = "./modules/mymodule"`.
4. Run `tofu init` to initialize.
5. Run `tofu plan` to preview.

```bash
# Initialize (downloads providers referenced in modules)
tofu init

# Preview changes
tofu plan

# Apply
tofu apply
```

## No tofu init Needed for Module Code Changes

When you only change the module's `.tf` files (not the source reference), you don't need to re-run `tofu init`. Unlike remote modules, local modules are not copied into `.terraform/modules/` - OpenTofu references them directly from their source directory, so any code edits are picked up on the next `tofu plan`.

## Conclusion

Local path module sources are the simplest and most flexible way to organize infrastructure code in OpenTofu. They are ideal for monorepo structures where all infrastructure modules live alongside the environments that use them. For shared modules across repositories, consider Git or registry sources instead.
