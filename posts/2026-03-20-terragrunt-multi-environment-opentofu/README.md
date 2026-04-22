# How to Use Terragrunt for Multi-Environment OpenTofu Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Multi-Environment, DRY, Infrastructure as Code, DevOps

Description: Learn how to use Terragrunt with OpenTofu to manage multi-environment infrastructure configurations with DRY backend configs, environment inheritance, and dependency management.

---

Terragrunt is a thin wrapper around OpenTofu that adds features for multi-environment management: DRY backend configurations, environment-level inheritance, and dependency ordering between modules. It's particularly valuable when managing many environments across multiple modules.

## Terragrunt Directory Structure

```text
infrastructure/
├── root.hcl                # Root config - shared across all environments
├── modules/
│   ├── network/
│   ├── database/
│   └── application/
└── environments/
    ├── dev/
    │   ├── env.hcl          # Dev-specific inputs
    │   ├── network/
    │   │   └── terragrunt.hcl
    │   ├── database/
    │   │   └── terragrunt.hcl
    │   └── application/
    │       └── terragrunt.hcl
    └── production/
        ├── env.hcl          # Production-specific inputs
        ├── network/
        │   └── terragrunt.hcl
        ├── database/
        │   └── terragrunt.hcl
        └── application/
            └── terragrunt.hcl
```

## Root Config

```hcl
# root.hcl

locals {
  # Parse environment from environments/<env>/<module> path
  path_components = split("/", path_relative_to_include())
  environment     = local.path_components[1]

  account_ids = {
    dev        = "111111111111"
    production = "333333333333"
  }

  account_id = local.account_ids[local.environment]
}

# DRY backend configuration - all environments inherit this
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "my-tofu-state-${local.account_id}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tofu-lock-${local.environment}"
  }
}

# Common inputs available to all child configs
inputs = {
  environment = local.environment
  account_id  = local.account_id
}
```

## Environment-Level Config

```hcl
# environments/production/env.hcl

# Production-specific values inherited by module configs
inputs = {
  instance_type = "t3.large"
  min_count     = 2
  multi_az      = true
}
```

## Module terragrunt.hcl with Dependencies

```hcl
# environments/production/application/terragrunt.hcl
include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

include "env" {
  path           = find_in_parent_folders("env.hcl")
  expose         = true
  merge_strategy = "no_merge"
}

# Reference the local module
terraform {
  source = "../../../modules/application"
}

# Declare dependency on network module
dependency "network" {
  config_path = "../network"

  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock"]
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

dependency "database" {
  config_path = "../database"

  mock_outputs = {
    endpoint = "mock.endpoint.rds.amazonaws.com"
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

# Pass dependency outputs as inputs
inputs = merge(
  include.env.inputs,
  {
    vpc_id             = dependency.network.outputs.vpc_id
    private_subnet_ids = dependency.network.outputs.private_subnet_ids
    db_endpoint        = dependency.database.outputs.endpoint
  }
)
```

## Running Terragrunt Commands

```bash
# Apply only one module
cd environments/production/application
terragrunt apply

# Apply all modules in production in dependency order
cd environments/production
terragrunt run --all apply

# Plan all environments
cd ../..
terragrunt run --all plan

# Destroy all modules (in reverse dependency order)
terragrunt run --all destroy
```

## Best Practices

- Use `mock_outputs` in dependencies for `plan` operations so you can plan without applying dependencies first.
- The `run --all` commands apply modules in the correct dependency order - don't manually manage apply order.
- Keep module `terragrunt.hcl` files minimal - they should only configure inputs and dependencies, not resources.
- Use `include "root"` and `expose = true` to access root-level `locals` in child configs.
- Consider Terragrunt's `generate` block to create provider.tf files with environment-specific configurations.
