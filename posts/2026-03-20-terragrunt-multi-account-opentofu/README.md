# How to Use Terragrunt for Multi-Account OpenTofu Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Multi-Account, Infrastructure as Code, AWS

Description: Learn how to use Terragrunt to manage multi-account OpenTofu deployments with DRY configurations, automatic state isolation, and account-level orchestration.

Terragrunt is a thin wrapper around OpenTofu that adds DRY configuration, automatic backend configuration, and dependency management. In multi-account setups, it shines by eliminating the need to repeat backend and provider configuration for every account and environment.

## Directory Structure

```text
infra/
├── root.hcl                    # Root config (shared backend, provider vars)
├── accounts/
│   ├── production/
│   │   ├── account.hcl         # Account-specific vars (account ID, region)
│   │   ├── networking/
│   │   │   └── terragrunt.hcl  # Module config
│   │   └── compute/
│   │       └── terragrunt.hcl
│   └── staging/
│       ├── account.hcl
│       ├── networking/
│       │   └── terragrunt.hcl
│       └── compute/
│           └── terragrunt.hcl
└── modules/
    ├── networking/
    └── compute/
```

## Root Configuration

```hcl
# infra/root.hcl - Root configuration

# Automatically configure S3 backend for every module

remote_state {
  backend = "s3"
  config = {
    bucket         = "mycompany-opentofu-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "opentofu-state-lock"
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

# Inject provider configuration into every module
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<-EOT
    provider "aws" {
      region = "${local.account_vars.locals.aws_region}"
      assume_role {
        role_arn = "arn:aws:iam::${local.account_vars.locals.aws_account_id}:role/DeploymentRole"
      }
    }
  EOT
}

locals {
  account_vars = read_terragrunt_config(find_in_parent_folders("account.hcl"))
}
```

## Account-Level Configuration

```hcl
# infra/accounts/production/account.hcl
locals {
  aws_account_id = "111111111111"
  aws_region     = "us-east-1"
  environment    = "production"
}
```

## Module-Level terragrunt.hcl

```hcl
# infra/accounts/production/networking/terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/networking"
}

inputs = {
  environment = local.account_vars.locals.environment
  vpc_cidr    = "10.1.0.0/16"
}

locals {
  account_vars = read_terragrunt_config(find_in_parent_folders("account.hcl"))
}
```

## Cross-Module Dependencies

```hcl
# infra/accounts/production/compute/terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/compute"
}

# Declare dependency on networking module
dependency "networking" {
  config_path = "../networking"
}

inputs = {
  vpc_id     = dependency.networking.outputs.vpc_id
  subnet_ids = dependency.networking.outputs.subnet_ids
}
```

## Deploying All Accounts

```bash
# Deploy all modules in all accounts
cd infra/accounts
terragrunt run --all apply

# Deploy only production
cd production
terragrunt run --all apply

# Deploy networking in all accounts
cd ..
terragrunt run --all --filter "*/networking" -- apply
```

## Conclusion

Terragrunt eliminates the repetition of backend and provider configuration across accounts and environments. Define the backend and provider generation once in the root `root.hcl`, use `account.hcl` files for account-specific variables, and declare cross-module dependencies explicitly. Use `run --all` for orchestrated multi-module deployments.
