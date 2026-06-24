# How to Use Terragrunt run-all for Multi-Module Operations with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Run-all, Multi-Module, Orchestration

Description: Learn how to use Terragrunt's run-all command to apply, plan, and destroy multiple OpenTofu modules simultaneously while respecting dependency order.

## Introduction

Terragrunt's `run --all` command discovers all `terragrunt.hcl` files beneath a directory and runs the specified OpenTofu command on each one in dependency order. This enables applying an entire environment with a single command rather than visiting each module directory individually.

## Basic run --all Usage

```bash
# Plan all modules under environments/prod

terragrunt run --all --working-dir environments/prod plan

# Apply all modules (run --all adds -auto-approve for apply and destroy)
terragrunt run --all --working-dir environments/prod apply

# Destroy all modules in reverse dependency order
terragrunt run --all --working-dir environments/prod destroy

# Run from within the directory
cd environments/prod
terragrunt run --all apply
```

## Dependency-Aware Execution Order

Given this directory structure:

```text
environments/prod/
├── networking/           # no dependencies
├── database/             # depends on networking
├── cache/                # depends on networking
└── services/
    ├── api/              # depends on networking, database, cache
    └── worker/           # depends on networking, database, cache
```

Terragrunt automatically determines the correct apply order:

```text
1. networking (parallelizable - no deps)
2. database, cache (parallelizable - both depend only on networking)
3. api, worker (parallelizable - after all their deps)
```

## Controlling Parallelism

```bash
# Run with limited parallelism
terragrunt run --all --parallelism 3 apply

# Run sequentially (parallelism = 1)
terragrunt run --all --parallelism 1 apply
```

## Excluding Specific Modules

```bash
# Exclude specific modules from run --all
terragrunt run --all \
  --working-dir environments/prod \
  --filter '!./services/worker' \
  --filter '!./cache' \
  apply
```

Or use the `terragrunt.hcl` exclude configuration:

```hcl
# environments/prod/legacy/terragrunt.hcl
# Exclude this module during run --all operations
terraform {
  source = "../../../modules/legacy"
}

# The exclude block prevents run --all from touching this module
exclude {
  if      = true
  actions = ["all"]
}
```

## Running on a Subset of Modules

```bash
# Only run modules in the services subtree
terragrunt run --all --working-dir environments/prod/services apply

# Run a specific command on all modules
terragrunt run --all --working-dir environments/prod output
```

## Non-Interactive Mode for CI/CD

```bash
# Disable Terragrunt prompts for CI/CD pipelines
terragrunt run --all \
  --non-interactive \
  --working-dir environments/prod \
  apply

# With an explicit OpenTofu auto-approve flag
terragrunt run --all \
  --non-interactive \
  --working-dir environments/prod \
  -- apply -auto-approve
```

## Handling Failures

```bash
# Continue applying other modules even if one fails
terragrunt run --all apply --queue-ignore-errors

# Stop as soon as any module fails
terragrunt run --all apply --fail-fast
```

## run --all with Custom Commands

```bash
# Run tofu init on all modules
terragrunt run --all --working-dir environments/prod init

# Run validate on all modules
terragrunt run --all --working-dir environments/prod validate

# Format check all modules
terragrunt run --all --working-dir . -- fmt -check
```

## Viewing the Execution Plan

```bash
# See which modules would be affected and in what order
terragrunt list --as plan -l --working-dir environments/prod

# Output dependency graph
terragrunt dag graph --working-dir environments/prod
```

## CI/CD Pipeline Integration

```yaml
# .github/workflows/deploy.yml
- name: Plan all modules
  run: |
    terragrunt run --all \
      --working-dir environments/prod \
      --non-interactive \
      -- plan -out=tfplan

- name: Apply on merge
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  run: |
    terragrunt run --all \
      --working-dir environments/prod \
      --non-interactive \
      apply
```

## Conclusion

Terragrunt's `run --all` command turns multi-module operations from a manual, error-prone process into a single declarative command. The automatic dependency resolution ensures modules are applied in the correct order, parallelism speeds up deployments, and the `--filter` flag gives fine-grained control when you need to skip specific modules.
