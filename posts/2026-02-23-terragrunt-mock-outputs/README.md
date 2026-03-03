# How to Use Terragrunt with Mock Outputs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Mock Outputs, Dependencies, Infrastructure as Code, DevOps

Description: Learn how to use Terragrunt mock_outputs to handle module dependencies during plan and validate without requiring all dependent infrastructure to exist first.

---

One of the trickiest parts of working with Terragrunt dependencies is the chicken-and-egg problem: you need to run `plan` on module B, but module B depends on outputs from module A, which hasn't been applied yet. Without a workaround, you'd have to apply modules in exact dependency order before you could even plan downstream modules. Mock outputs solve this by providing placeholder values during plan and validate operations.

## The Problem

Consider this dependency setup:

```hcl
# app/terragrunt.hcl
dependency "vpc" {
  config_path = "../vpc"
}

dependency "rds" {
  config_path = "../rds"
}

inputs = {
  vpc_id     = dependency.vpc.outputs.vpc_id
  subnet_ids = dependency.vpc.outputs.private_subnet_ids
  db_endpoint = dependency.rds.outputs.endpoint
}
```

If you try to run `terragrunt plan` before the VPC and RDS modules have been applied, you get:

```text
ERRO[0000] Module /infrastructure/dev/vpc has not been applied yet.
Cannot retrieve outputs.
```

## Basic Mock Outputs

Add `mock_outputs` to each dependency to provide placeholder values:

```hcl
dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id             = "vpc-mock-12345"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2", "subnet-mock-3"]
    public_subnet_ids  = ["subnet-mock-4", "subnet-mock-5", "subnet-mock-6"]
  }
}

dependency "rds" {
  config_path = "../rds"

  mock_outputs = {
    endpoint    = "mock-db.cluster-xyz.us-east-1.rds.amazonaws.com"
    port        = 5432
    db_name     = "mock_database"
  }
}

inputs = {
  vpc_id      = dependency.vpc.outputs.vpc_id
  subnet_ids  = dependency.vpc.outputs.private_subnet_ids
  db_endpoint = dependency.rds.outputs.endpoint
}
```

Now `terragrunt plan` works even when the VPC and RDS haven't been applied - it uses the mock values instead.

## Controlling When Mocks Are Used

By default, mock_outputs are used whenever the real outputs aren't available. You can restrict this to specific commands:

```hcl
dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id             = "vpc-mock-12345"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }

  # Only use mocks for plan and validate - require real outputs for apply
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}
```

With this setting:
- `terragrunt validate` - uses mock outputs
- `terragrunt plan` - uses mock outputs
- `terragrunt apply` - fails if the dependency hasn't been applied (which is what you want)

This is the recommended configuration. You don't want to accidentally apply infrastructure with mock values.

## Mock Output Types Must Match

The mock values need to match the types that the Terraform module expects. If the module expects a list, the mock must be a list:

```hcl
# Wrong - type mismatch will cause plan errors
mock_outputs = {
  subnet_ids = "subnet-mock-1"    # String, but module expects list
}

# Correct
mock_outputs = {
  subnet_ids = ["subnet-mock-1"]  # List, matching the module's expectation
}
```

For complex types:

```hcl
mock_outputs = {
  # Map of objects
  security_groups = {
    web = {
      id   = "sg-mock-web"
      name = "mock-web-sg"
    }
    app = {
      id   = "sg-mock-app"
      name = "mock-app-sg"
    }
  }

  # List of objects
  subnets = [
    {
      id         = "subnet-mock-1"
      cidr_block = "10.0.1.0/24"
      az         = "us-east-1a"
    },
    {
      id         = "subnet-mock-2"
      cidr_block = "10.0.2.0/24"
      az         = "us-east-1b"
    }
  ]

  # Boolean
  is_production = false

  # Number
  instance_count = 2
}
```

## Mock Outputs with merge_strategy

When the dependency module has been partially applied, you might get some outputs but not all of them. The `mock_outputs_merge_strategy_with_state` option handles this:

```hcl
dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id             = "vpc-mock-12345"
    private_subnet_ids = ["subnet-mock-1"]
    public_subnet_ids  = ["subnet-mock-2"]
    nat_gateway_ids    = ["nat-mock-1"]
  }

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]

  # "shallow" (default) - use real outputs when available, fall back to mocks
  # "no_merge" - use only real outputs or only mocks, never mix
  # "deep_map_only" - deep merge maps, shallow merge everything else
  mock_outputs_merge_strategy_with_state = "shallow"
}
```

The `shallow` strategy (default) is usually what you want. It uses real output values when they exist and fills in mock values for any outputs that are missing.

## Common Pattern: Centralized Mock Definitions

If many modules depend on the same upstream module, define mocks in a shared configuration:

```hcl
# _envcommon/vpc_dependency.hcl

dependency "vpc" {
  config_path = "${get_terragrunt_dir()}/../vpc"

  mock_outputs = {
    vpc_id              = "vpc-mock-12345"
    private_subnet_ids  = ["subnet-mock-1", "subnet-mock-2", "subnet-mock-3"]
    public_subnet_ids   = ["subnet-mock-4", "subnet-mock-5", "subnet-mock-6"]
    database_subnet_ids = ["subnet-mock-7", "subnet-mock-8"]
    vpc_cidr_block      = "10.0.0.0/16"
  }

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}
```

Then include it in modules that need it:

```hcl
# dev/ecs/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

include "vpc_dep" {
  path   = "${get_repo_root()}/_envcommon/vpc_dependency.hcl"
  expose = true
}

terraform {
  source = "../../modules/ecs"
}

inputs = {
  vpc_id     = dependency.vpc.outputs.vpc_id
  subnet_ids = dependency.vpc.outputs.private_subnet_ids
}
```

## Mock Outputs for run-all

Mock outputs are especially important when using `run-all plan`. Without them, Terragrunt would have to apply dependencies first:

```bash
# This works even on a fresh environment with no applied infrastructure
cd infrastructure/dev
terragrunt run-all plan --terragrunt-non-interactive
```

Terragrunt resolves the dependency graph, sees that mock_outputs are defined, and uses them for modules whose dependencies haven't been applied.

## Mock Outputs for CI/CD Plan Jobs

In CI pipelines, you typically want to run `plan` on all modules in a PR, even if upstream dependencies haven't changed:

```hcl
# Standard pattern for CI-friendly dependencies
dependency "networking" {
  config_path = "../networking"

  mock_outputs = {
    vpc_id            = "vpc-00000000000000000"
    private_subnets   = ["subnet-00000000000000001", "subnet-00000000000000002"]
    security_group_id = "sg-00000000000000000"
  }

  # Allow mocks for plan (CI runs plan on PRs)
  # Require real outputs for apply (after merge)
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}
```

## Debugging Mock Output Issues

If you're getting unexpected values, check whether real outputs or mocks are being used:

```bash
# Debug logging shows which outputs are used
terragrunt plan --terragrunt-log-level debug 2>&1 | grep -i "mock\|output"

# Check if the dependency has actual outputs
cd ../vpc
terragrunt output
```

Common issues:
- Mock output type doesn't match the variable type in the module
- Mock output key name doesn't match the actual output name
- Using mocks when you meant to use real outputs (forgot to apply the dependency)

## Mock Outputs vs skip_outputs

Another option for handling missing dependencies is `skip_outputs`:

```hcl
dependency "vpc" {
  config_path  = "../vpc"
  skip_outputs = true
}
```

With `skip_outputs = true`, Terragrunt doesn't try to fetch outputs at all. This means you can't reference `dependency.vpc.outputs.*` in your inputs - it's useful when you only need the dependency for ordering, not for data.

Mock outputs are better when you actually need the output values for planning.

## Summary

Mock outputs are essential for a smooth Terragrunt workflow, especially in CI/CD. The key rules: always set `mock_outputs_allowed_terraform_commands` to `["validate", "plan"]` so mocks are never used during apply, make sure mock types match what your modules expect, and centralize mock definitions for commonly-used dependencies. For more on managing dependencies between modules, see our [complex dependency graphs guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-complex-dependency-graphs/view).
