# Using Local Module Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module

Description: Learn how to reference and use local directory modules in OpenTofu for code organization and reuse within a project.

Local module sources reference modules stored on your local filesystem. They're ideal during development, for project-internal modules, and when you want to keep all code in a single repository.

## Basic Local Path Reference

```hcl
module "vpc" {
  source = "./modules/vpc"

  cidr_block          = "10.0.0.0/16"
  availability_zones  = ["us-east-1a", "us-east-1b"]
  environment         = var.environment
}
```

A local path must begin with either `./` or `../` to distinguish it from a module registry address:
- `./modules/vpc` - relative to the current configuration
- `../shared/network` - parent directory

Absolute paths (starting with `/` or a drive letter) are not considered local paths by OpenTofu - they are treated as packages and copied into the local module cache, similar to remote modules.

## Directory Structure

```text
my-infrastructure/
├── main.tf                # Root module
├── variables.tf
├── outputs.tf
└── modules/
    ├── vpc/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── eks/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── rds/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

```hcl
# main.tf

module "vpc" {
  source = "./modules/vpc"
  name   = "production"
}

module "eks" {
  source     = "./modules/eks"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}

module "database" {
  source     = "./modules/rds"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids
}
```

## Local Modules During Development

```hcl
# Develop a module locally before publishing
module "my_module" {
  source = "../../terraform-aws-mymodule"  # Local checkout of the module repo

  name        = "test"
  environment = "dev"
}
```

## No Version Constraints for Local Modules

Unlike registry modules, local modules don't support version constraints - they always use whatever is on disk:

```hcl
# This is valid for registry modules:
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"  # ✓ Version constraint
}

# Local modules don't support version:
module "vpc" {
  source  = "./modules/vpc"
  # version = "..." would cause an error
}
```

## Testing with Local Overrides

During development, use local module paths to test changes before pushing:

```hcl
# Temporarily override a registry module with local version
# In development only - don't commit this!
module "networking" {
  # source = "myorg/networking/aws"  # Production
  source = "../terraform-aws-networking"  # Local dev
}
```

## Conclusion

Local module sources are the simplest way to organize code within a project. Use them for project-specific modules that won't be shared, during development of modules you'll later publish, and for testing changes to shared modules locally before committing. Remember that local modules don't support version constraints - for versioned, shared modules, use a registry or Git source.
