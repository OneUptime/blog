# How to Use Terragrunt Skip Flag for Selective Execution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Selective Execution, Skip, Infrastructure as Code, DevOps

Description: Learn how to use the Terragrunt skip flag along with include and exclude directory options to selectively run or skip modules during plan, apply, and destroy operations.

---

When you're managing a large infrastructure repo with Terragrunt, you rarely want to run every module at once. Maybe you need to skip a module that's broken, exclude production databases from a bulk plan, or only apply changes to a specific subset of modules. Current Terragrunt provides several mechanisms for selective execution: the `exclude` block, include/exclude directories, and run queue flags such as `--queue-include-external`.

## The exclude Block

Older Terragrunt versions supported a top-level `skip` flag, but current Terragrunt removed it. Use the `exclude` block in `terragrunt.hcl` instead:

```hcl
# dev/legacy-app/terragrunt.hcl

# Exclude this unit entirely - Terragrunt will not run matching actions on it
exclude {
  if      = true
  actions = ["all"]
}

terraform {
  source = "../../modules/legacy-app"
}

inputs = {
  app_name = "legacy"
}
```

When the `exclude` condition is true, running `terragrunt run --all plan` from the parent directory will skip this unit for the matching action.

## Conditional Exclude

Make the exclude condition dynamic based on conditions:

```hcl
locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_vars.locals.environment

  # Exclude this module in dev environments
  exclude_in_dev = local.environment == "dev"
}

exclude {
  if      = local.exclude_in_dev
  actions = ["all"]
}

terraform {
  source = "../../modules/waf"
}
```

Or based on environment variables:

```hcl
# Exclude expensive modules during quick CI checks
exclude {
  if      = get_env("QUICK_CHECK", "false") == "true"
  actions = ["all"]
}

terraform {
  source = "../../modules/data-warehouse"
}
```

## Include and Exclude Directories

The `--queue-include-dir` and `--queue-exclude-dir` flags filter which units `run --all` processes:

### Include Only Specific Modules

```bash
# Only plan the VPC and security groups
terragrunt run --all \
  --queue-include-dir "dev/vpc" \
  --queue-include-dir "dev/security-groups" \
  -- plan
```

### Exclude Specific Modules

```bash
# Plan everything except the database and data warehouse
terragrunt run --all \
  --queue-exclude-dir "dev/rds" \
  --queue-exclude-dir "dev/data-warehouse" \
  -- plan
```

### Glob Patterns

```bash
# Include all modules in us-east-1
terragrunt run --all \
  --queue-include-dir "dev/us-east-1/*" \
  -- plan

# Exclude all monitoring modules
terragrunt run --all \
  --queue-exclude-dir "*/monitoring" \
  -- plan
```

## Targeting Specific Modules with run --all

Combine directory filters with `run --all` for precise control:

```bash
# Apply only networking modules across all environments
terragrunt run --all \
  --queue-include-dir "*/*/vpc" \
  --queue-include-dir "*/*/subnets" \
  --queue-include-dir "*/*/route-tables" \
  --non-interactive \
  -- apply

# Plan only database-related modules in dev
terragrunt run --all \
  --queue-include-dir "dev/*/rds" \
  --queue-include-dir "dev/*/elasticache" \
  --queue-include-dir "dev/*/dynamodb" \
  -- plan
```

## Skipping Dependencies

Current Terragrunt performs strict inclusion by default when you include specific units:

```bash
# This plans only the ECS unit matched by the include flag
terragrunt run --all --queue-include-dir "dev/ecs" -- plan
```

External dependencies are also excluded by default. To include them explicitly:

```bash
# Include external dependencies in the run queue
terragrunt run --all \
  --queue-include-dir "dev/ecs" \
  --queue-include-external \
  -- plan
```

The old `--terragrunt-strict-include` flag maps to `--queue-strict-include`, but `--queue-strict-include` is deprecated because Terragrunt now performs strict inclusion by default.

## Practical Patterns

### Pattern 1: Exclude Modules Under Maintenance

```hcl
# dev/rds/terragrunt.hcl

locals {
  # Set this to true while doing manual maintenance
  under_maintenance = true
}

exclude {
  if      = local.under_maintenance
  actions = ["all"]
}

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

exclude {
  if      = !contains(["staging", "production"], local.environment)
  actions = ["all"]
}

terraform {
  source = "../../modules/datadog-monitors"
}
```

### Pattern 3: Feature Flags

Use Terragrunt feature flags to control whether a unit runs:

```hcl
feature "enable_new_auth" {
  default = false
}

exclude {
  if      = !feature.enable_new_auth.value
  actions = ["all"]
}

terraform {
  source = "../../modules/cognito"
}
```

Enable the feature from the CLI:

```bash
terragrunt --feature enable_new_auth=true run --all -- apply
```

### Pattern 4: Destroy Safety

Exclude critical modules during destroy to prevent accidents:

```hcl
locals {
  # Never destroy the database unless explicitly requested
  allow_destroy = get_env("ALLOW_DB_DESTROY", "false") == "true"
}

exclude {
  if      = !local.allow_destroy
  actions = ["destroy"]
}

terraform {
  source = "../../modules/rds"
}
```

## Using --queue-exclude-dir in CI/CD

In CI pipelines, exclude directories dynamically:

```yaml
# GitHub Actions example
- name: Plan Infrastructure
  run: |
    EXCLUDE_FLAGS=""

    # Skip expensive modules on draft PRs
    if [ "${{ github.event.pull_request.draft }}" == "true" ]; then
      EXCLUDE_FLAGS="--queue-exclude-dir dev/data-warehouse"
      EXCLUDE_FLAGS="$EXCLUDE_FLAGS --queue-exclude-dir dev/ml-pipeline"
    fi

    terragrunt run --all \
      --non-interactive \
      $EXCLUDE_FLAGS \
      -- plan
```

## Listing Modules Without Running Them

To see which modules would be included or excluded without actually running anything:

```bash
# Show the dependency graph
terragrunt dag graph

# With debug logging, you can see which modules are included/excluded
terragrunt run --all \
  --queue-include-dir "dev/vpc" \
  --log-level debug \
  -- plan 2>&1 | grep -E "include|exclude"
```

## The --queue-ignore-errors Flag

When running `run --all`, if one module fails, dependent modules are skipped but independent modules continue. Use `--queue-ignore-errors` to change this:

```bash
# Continue running modules even if their dependencies failed
terragrunt run --all \
  --queue-ignore-errors \
  -- plan

# This is useful when one module has a known issue
# and you still want to plan everything else
```

## Combining Exclude Strategies

You can combine the `exclude` block in configuration with CLI include/exclude flags:

```bash
# Unit-level exclude (in terragrunt.hcl)
exclude {
  if      = true
  actions = ["all"]
}

# Directory-level exclude (CLI)
terragrunt run --all --queue-exclude-dir "dev/legacy" -- plan

# The result: both mechanisms are applied
# A unit is skipped if EITHER its exclude block matches OR it's excluded via CLI
```

## Summary

Selective execution in Terragrunt comes down to three mechanisms: the `exclude` block for configuration-level control, `--queue-include-dir` and `--queue-exclude-dir` for CLI-level filtering, and `--queue-include-external` when you explicitly want to include external dependencies. Use `exclude` for permanent or condition-based skipping, and use the CLI flags for ad-hoc filtering during development or CI. For more on running subsets of your infrastructure, see our guide on [Terragrunt with CI/CD pipelines](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-ci-cd-pipelines/view).
