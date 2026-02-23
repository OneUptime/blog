# How to Use Terragrunt Skip Flag for Selective Execution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Selective Execution, Skip, Infrastructure as Code, DevOps

Description: Learn how to use the Terragrunt skip flag along with include and exclude directory options to selectively run or skip modules during plan, apply, and destroy operations.

---

When you're managing a large infrastructure repo with Terragrunt, you rarely want to run every module at once. Maybe you need to skip a module that's broken, exclude production databases from a bulk plan, or only apply changes to a specific subset of modules. Terragrunt provides several mechanisms for selective execution: the `skip` flag, include/exclude directories, and the `--terragrunt-ignore-external-dependencies` flag.

## The skip Flag

The simplest way to skip a module is the `skip` flag in its `terragrunt.hcl`:

```hcl
# dev/legacy-app/terragrunt.hcl

# Skip this module entirely - Terragrunt will not run any commands on it
skip = true

terraform {
  source = "../../modules/legacy-app"
}

inputs = {
  app_name = "legacy"
}
```

When `skip = true`, running `terragrunt run-all plan` from the parent directory will silently skip this module. It won't appear in the plan output at all.

## Conditional Skip

Make the skip flag dynamic based on conditions:

```hcl
locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_vars.locals.environment

  # Skip this module in dev environments
  skip_in_dev = local.environment == "dev"
}

skip = local.skip_in_dev

terraform {
  source = "../../modules/waf"
}
```

Or based on environment variables:

```hcl
# Skip expensive modules during quick CI checks
skip = get_env("QUICK_CHECK", "false") == "true"

terraform {
  source = "../../modules/data-warehouse"
}
```

## Include and Exclude Directories

The `--terragrunt-include-dir` and `--terragrunt-exclude-dir` flags filter which modules `run-all` processes:

### Include Only Specific Modules

```bash
# Only plan the VPC and security groups
terragrunt run-all plan \
  --terragrunt-include-dir "dev/vpc" \
  --terragrunt-include-dir "dev/security-groups"
```

### Exclude Specific Modules

```bash
# Plan everything except the database and data warehouse
terragrunt run-all plan \
  --terragrunt-exclude-dir "dev/rds" \
  --terragrunt-exclude-dir "dev/data-warehouse"
```

### Glob Patterns

```bash
# Include all modules in us-east-1
terragrunt run-all plan \
  --terragrunt-include-dir "dev/us-east-1/*"

# Exclude all monitoring modules
terragrunt run-all plan \
  --terragrunt-exclude-dir "*/monitoring"
```

## Targeting Specific Modules with run-all

Combine directory filters with `run-all` for precise control:

```bash
# Apply only networking modules across all environments
terragrunt run-all apply \
  --terragrunt-include-dir "*/*/vpc" \
  --terragrunt-include-dir "*/*/subnets" \
  --terragrunt-include-dir "*/*/route-tables" \
  --terragrunt-non-interactive \
  -auto-approve

# Plan only database-related modules in dev
terragrunt run-all plan \
  --terragrunt-include-dir "dev/*/rds" \
  --terragrunt-include-dir "dev/*/elasticache" \
  --terragrunt-include-dir "dev/*/dynamodb"
```

## Skipping Dependencies

When you include specific modules, Terragrunt still processes their dependencies by default. This can be surprising:

```bash
# You might expect this to only plan the ECS module
terragrunt run-all plan --terragrunt-include-dir "dev/ecs"

# But if ECS depends on VPC, Terragrunt also plans the VPC
```

To change this behavior:

```bash
# Strictly include only the specified modules, skip dependencies
terragrunt run-all plan \
  --terragrunt-include-dir "dev/ecs" \
  --terragrunt-strict-include

# Or ignore external dependencies (dependencies outside the working directory)
terragrunt run-all plan \
  --terragrunt-ignore-external-dependencies
```

The `--terragrunt-strict-include` flag means only the explicitly included modules are processed. Dependencies are skipped unless they're also in the include list.

## Practical Patterns

### Pattern 1: Skip Modules Under Maintenance

```hcl
# dev/rds/terragrunt.hcl

locals {
  # Set this to true while doing manual maintenance
  under_maintenance = true
}

skip = local.under_maintenance

terraform {
  source = "../../modules/rds"
}
```

### Pattern 2: Environment-Gated Modules

Some modules only make sense in certain environments:

```hcl
# Only deploy monitoring in staging and production
locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_vars.locals.environment
}

skip = !contains(["staging", "production"], local.environment)

terraform {
  source = "../../modules/datadog-monitors"
}
```

### Pattern 3: Feature Flags

Use environment variables as feature flags:

```hcl
locals {
  # Enable new features via environment variable
  enable_new_auth = get_env("ENABLE_NEW_AUTH", "false") == "true"
}

skip = !local.enable_new_auth

terraform {
  source = "../../modules/cognito"
}
```

### Pattern 4: Destroy Safety

Skip critical modules during destroy to prevent accidents:

```hcl
locals {
  # Never destroy the database unless explicitly requested
  is_destroy  = get_env("TERRAGRUNT_COMMAND", "") == "destroy"
  allow_destroy = get_env("ALLOW_DB_DESTROY", "false") == "true"
}

skip = local.is_destroy && !local.allow_destroy

terraform {
  source = "../../modules/rds"
}
```

## Using --terragrunt-exclude-dir in CI/CD

In CI pipelines, exclude directories dynamically:

```yaml
# GitHub Actions example
- name: Plan Infrastructure
  run: |
    EXCLUDE_FLAGS=""

    # Skip expensive modules on draft PRs
    if [ "${{ github.event.pull_request.draft }}" == "true" ]; then
      EXCLUDE_FLAGS="--terragrunt-exclude-dir dev/data-warehouse"
      EXCLUDE_FLAGS="$EXCLUDE_FLAGS --terragrunt-exclude-dir dev/ml-pipeline"
    fi

    terragrunt run-all plan \
      --terragrunt-non-interactive \
      $EXCLUDE_FLAGS
```

## Listing Modules Without Running Them

To see which modules would be included or excluded without actually running anything:

```bash
# Show the dependency graph (lists all discovered modules)
terragrunt graph-dependencies

# With debug logging, you can see which modules are included/excluded
terragrunt run-all plan \
  --terragrunt-include-dir "dev/vpc" \
  --terragrunt-log-level debug 2>&1 | grep -E "include|exclude|skip"
```

## The --terragrunt-ignore-dependency-errors Flag

When running `run-all`, if one module fails, dependent modules are skipped but independent modules continue. Use `--terragrunt-ignore-dependency-errors` to change this:

```bash
# Continue running modules even if their dependencies failed
terragrunt run-all plan \
  --terragrunt-ignore-dependency-errors

# This is useful when one module has a known issue
# and you still want to plan everything else
```

## Combining Skip Strategies

You can combine the `skip` flag in configuration with CLI include/exclude flags:

```bash
# Module-level skip (in terragrunt.hcl)
skip = true   # Always skipped

# Directory-level exclude (CLI)
terragrunt run-all plan --terragrunt-exclude-dir "dev/legacy"

# The result: both mechanisms are applied
# A module is skipped if EITHER skip=true OR it's excluded via CLI
```

## Summary

Selective execution in Terragrunt comes down to three mechanisms: the `skip` flag for configuration-level control, `--terragrunt-include-dir` and `--terragrunt-exclude-dir` for CLI-level filtering, and `--terragrunt-strict-include` for preventing dependency auto-inclusion. Use `skip` for permanent or condition-based skipping, and use the CLI flags for ad-hoc filtering during development or CI. For more on running subsets of your infrastructure, see our guide on [Terragrunt with CI/CD pipelines](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-ci-cd-pipelines/view).
