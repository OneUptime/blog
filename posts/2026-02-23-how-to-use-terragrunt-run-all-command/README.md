# How to Use Terragrunt run-all Command

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Module Orchestration, Automation

Description: A comprehensive guide to the Terragrunt run-all command for executing Terraform commands across multiple modules with dependency-aware ordering and parallelism.

---

One of Terragrunt's biggest advantages over plain Terraform is the ability to manage multiple modules at once. The `run-all` command lets you execute any Terraform command across all modules in a directory tree, respecting dependency ordering and running independent modules in parallel.

## What run-all Does

The `run-all` command recursively finds all `terragrunt.hcl` files in the current directory and its subdirectories, builds a dependency graph based on `dependency` and `dependencies` blocks, and executes the specified Terraform command against each module in the correct order.

```bash
# Apply all modules under the current directory
terragrunt run-all apply

# Plan all modules under the current directory
terragrunt run-all plan

# Destroy all modules (in reverse dependency order)
terragrunt run-all destroy

# Init all modules
terragrunt run-all init

# Validate all modules
terragrunt run-all validate
```

## Basic Usage

Consider this structure:

```
live/dev/
  vpc/
    terragrunt.hcl
  rds/
    terragrunt.hcl           # depends on vpc
  ecs/
    terragrunt.hcl           # depends on vpc
  app/
    terragrunt.hcl           # depends on rds and ecs
```

From the `live/dev/` directory:

```bash
cd live/dev
terragrunt run-all plan
```

Terragrunt will:

1. Discover all four `terragrunt.hcl` files
2. Build the dependency graph
3. Run `terraform plan` on `vpc` first (no dependencies)
4. Run `terraform plan` on `rds` and `ecs` in parallel (both depend only on `vpc`)
5. Run `terraform plan` on `app` last (depends on `rds` and `ecs`)

## Dependency Graph

The dependency graph is built from `dependency` and `dependencies` blocks:

```hcl
# rds/terragrunt.hcl
dependency "vpc" {
  config_path = "../vpc"
}

# ecs/terragrunt.hcl
dependency "vpc" {
  config_path = "../vpc"
}

# app/terragrunt.hcl
dependency "rds" {
  config_path = "../rds"
}
dependency "ecs" {
  config_path = "../ecs"
}
```

This creates the graph:

```
vpc --> rds --> app
  \--> ecs --/
```

Terragrunt visualizes this when you run:

```bash
# Show the dependency graph
terragrunt graph-dependencies
```

## Parallelism

By default, Terragrunt runs independent modules in parallel. Modules that do not depend on each other execute simultaneously:

```bash
# Default parallelism - independent modules run in parallel
terragrunt run-all apply

# Limit parallelism to 2 concurrent modules
terragrunt run-all apply --terragrunt-parallelism 2

# Run modules one at a time (sequential)
terragrunt run-all apply --terragrunt-parallelism 1
```

Limiting parallelism is useful when you are hitting API rate limits or when your CI/CD runner has limited resources.

## The --terragrunt-ignore-dependency-errors Flag

By default, if a module fails, all modules that depend on it are skipped. You can override this:

```bash
# Continue even if a dependency fails
terragrunt run-all apply --terragrunt-ignore-dependency-errors
```

This is useful during debugging when you want to see all errors at once rather than fixing them one by one.

## Including and Excluding Modules

You can control which modules are included:

```bash
# Only include specific modules
terragrunt run-all plan --terragrunt-include-dir "*/vpc" --terragrunt-include-dir "*/rds"

# Exclude specific modules
terragrunt run-all plan --terragrunt-exclude-dir "*/monitoring"

# Combine both
terragrunt run-all apply --terragrunt-include-dir "*/compute/*" --terragrunt-exclude-dir "*/compute/batch"
```

The patterns support glob matching, making it easy to target groups of modules.

## Non-Interactive Mode

When running in CI/CD, you want non-interactive execution:

```bash
# Auto-approve all applies (no prompts)
terragrunt run-all apply --terragrunt-non-interactive

# This passes -auto-approve to terraform apply for each module
```

## Practical Scenarios

### Deploying a Full Environment

```bash
# Deploy everything in the dev environment
cd live/dev
terragrunt run-all apply --terragrunt-non-interactive
```

This is how you set up a new environment from scratch. Terragrunt handles the ordering, so networking comes before compute, compute before applications, and so on.

### Updating All Modules After a Module Change

After modifying a shared Terraform module, update all environments:

```bash
# Plan all environments to see what changes
cd live
terragrunt run-all plan

# If the plans look good, apply
terragrunt run-all apply --terragrunt-non-interactive
```

### Running Only on a Subset

```bash
# Only update networking modules across all environments
cd live
terragrunt run-all apply --terragrunt-include-dir "*/*/vpc" --terragrunt-non-interactive
```

### Validating Everything

```bash
# Validate all configurations (fast, no state needed)
cd live
terragrunt run-all validate
```

### Formatting Check

```bash
# Check formatting across all modules
cd live
terragrunt run-all fmt -check
```

## Output Handling

With multiple modules running, output can get noisy. Terragrunt prefixes each module's output with its path:

```
[live/dev/vpc] Initializing the backend...
[live/dev/vpc] Apply complete! Resources: 5 added, 0 changed, 0 destroyed.
[live/dev/rds] Initializing the backend...
[live/dev/ecs] Initializing the backend...
```

For cleaner output in CI:

```bash
# Reduce Terragrunt's own log output
terragrunt run-all apply --terragrunt-log-level error --terragrunt-non-interactive
```

## Error Handling and Retries

Terragrunt has built-in retry support for transient errors:

```hcl
# Root terragrunt.hcl

# Retry configuration for transient errors
retry_max_attempts = 3
retry_sleep_interval_sec = 5

# Specific error messages to retry on
retryable_errors = [
  "(?s).*Error creating.*",
  "(?s).*RequestLimitExceeded.*",
  "(?s).*Throttling.*",
]
```

This is especially useful with `run-all` because applying many modules simultaneously can trigger cloud provider rate limits.

## run-all vs Individual Commands

It is worth noting when not to use `run-all`:

- **First-time debugging**: When setting up a new module, run it individually to see clear output
- **Sensitive changes**: For production database migrations or breaking changes, apply modules individually with careful review
- **Partial updates**: If you only changed one module, running it directly is faster than `run-all` scanning the entire tree

```bash
# Direct module execution - no scanning, no graph
cd live/dev/app
terragrunt apply

# vs run-all from the parent
cd live/dev
terragrunt run-all apply
```

## CI/CD Integration

A typical CI/CD pipeline using `run-all`:

```yaml
# GitHub Actions example
name: Deploy Infrastructure
on:
  push:
    branches: [main]

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Plan dev
        run: |
          cd live/dev
          terragrunt run-all plan --terragrunt-non-interactive 2>&1 | tee plan-output.txt

      - name: Apply dev
        run: |
          cd live/dev
          terragrunt run-all apply --terragrunt-non-interactive --terragrunt-parallelism 3
```

## Conclusion

The `run-all` command transforms Terragrunt from a single-module wrapper into a full orchestration tool. It handles dependency ordering, parallel execution, and error propagation across your entire infrastructure.

Start using it for planning across all modules in an environment, then gradually adopt it for applies as you build confidence in your dependency graph. Use parallelism limits and include/exclude filters to control scope and resource usage.

For specific details on the plan, apply, and destroy variants, see:
- [How to Use Terragrunt plan-all for Multi-Module Plans](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-plan-all-for-multi-module-plans/view)
- [How to Use Terragrunt apply-all for Multi-Module Apply](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-apply-all-for-multi-module-apply/view)
- [How to Use Terragrunt destroy-all for Multi-Module Destroy](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-destroy-all-for-multi-module-destroy/view)
