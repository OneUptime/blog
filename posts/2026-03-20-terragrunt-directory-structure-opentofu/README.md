# How to Set Up Terragrunt Directory Structure for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Directory Structure, GitOps, DRY, Infrastructure Organization

Description: Learn how to organize a Terragrunt repository structure for OpenTofu to achieve DRY configurations across multiple environments and regions with clear hierarchy.

## Introduction

Terragrunt adds a configuration layer on top of OpenTofu that enables DRY multi-environment setups. A well-organized directory structure makes it clear where environment-specific values live versus shared configuration, and enables commands like `run --all` to orchestrate deployments across the entire hierarchy.

## Recommended Directory Structure

```text
infrastructure/
├── root.hcl                    # Root config (backend, provider, tags)
├── _envcommon/                 # Shared config snippets
│   ├── networking.hcl
│   ├── database.hcl
│   └── ecs-service.hcl
├── environments/
│   ├── dev/
│   │   ├── env.hcl             # Dev environment variables
│   │   ├── networking/
│   │   │   └── terragrunt.hcl
│   │   ├── database/
│   │   │   └── terragrunt.hcl
│   │   └── services/
│   │       ├── api/
│   │       │   └── terragrunt.hcl
│   │       └── worker/
│   │           └── terragrunt.hcl
│   ├── staging/
│   │   ├── env.hcl
│   │   └── ... (same structure as dev)
│   └── prod/
│       ├── env.hcl
│       └── ... (same structure as dev)
└── modules/
    ├── vpc/
    ├── database/
    └── ecs-service/
```

## Root Configuration File

```hcl
# root.hcl

# This is the root configuration inherited by all child configs

locals {
  # Read the env.hcl from the environment directory
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  env      = local.env_vars.locals.environment
  region   = local.env_vars.locals.aws_region
  account  = local.env_vars.locals.aws_account_id
}

# Configure S3 backend for all child modules
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket         = "my-company-tofu-state-${local.account}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = local.region
    encrypt        = true
    dynamodb_table = "tofu-state-lock"
  }
}

# Generate provider configuration for all child modules
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.region}"
  default_tags {
    tags = {
      Environment = "${local.env}"
      ManagedBy   = "OpenTofu+Terragrunt"
    }
  }
}
EOF
}
```

## Environment Variables File

```hcl
# environments/prod/env.hcl
locals {
  environment  = "prod"
  aws_region   = "us-east-1"
  aws_account_id = "123456789012"

  vpc_cidr     = "10.0.0.0/16"
  db_class     = "db.r6g.large"
  min_capacity = 3
  max_capacity = 20
}
```

## Child Module terragrunt.hcl

```hcl
# environments/prod/networking/terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "envcommon" {
  path   = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/networking.hcl"
  expose = true
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}//modules/vpc"
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

inputs = {
  name       = "prod-vpc"
  cidr_block = local.env_vars.locals.vpc_cidr
  environment = local.env_vars.locals.environment
}
```

## Running Commands Across All Environments

```bash
# Plan all modules in production
terragrunt run --all --working-dir environments/prod -- plan

# Apply all modules in dev (auto-approves)
terragrunt run --all --working-dir environments/dev -- apply

# Destroy a specific environment
terragrunt run --all --working-dir environments/dev -- destroy
```

## Conclusion

The Terragrunt directory structure mirrors your environment hierarchy. The root `root.hcl` provides shared backend and provider configuration, `env.hcl` files capture per-environment values, and child `terragrunt.hcl` files include both. This structure scales to many environments and components without config duplication.
