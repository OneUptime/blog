# How to Use the -chdir Flag to Run Terraform from Another Directory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, CLI, Workflow

Description: Learn how to use the Terraform -chdir flag to run commands against configurations in different directories without changing your working directory.

---

If you manage multiple Terraform configurations across different directories, you have probably been doing a lot of `cd` commands. Jump into the networking directory, run plan. Jump into the compute directory, run apply. Jump back. It gets tedious, and it makes scripting harder than it needs to be.

The `-chdir` flag, introduced in Terraform 0.14, solves this cleanly. It tells Terraform to switch to a different directory before running the command, without actually changing your shell's working directory.

## Basic Syntax

The `-chdir` flag must come before the subcommand:

```bash
# Correct - -chdir goes before the subcommand
terraform -chdir=environments/production plan

# Wrong - this will not work
terraform plan -chdir=environments/production
```

This is an important distinction. Unlike most Terraform flags that come after the subcommand, `-chdir` is a global flag that modifies where Terraform looks for configuration files.

## Practical Examples

### Running Plan Against Multiple Environments

```bash
# Assume this directory structure:
# infra/
#   environments/
#     dev/
#       main.tf
#       terraform.tfvars
#     staging/
#       main.tf
#       terraform.tfvars
#     production/
#       main.tf
#       terraform.tfvars

# From the infra/ directory, plan each environment
terraform -chdir=environments/dev plan
terraform -chdir=environments/staging plan
terraform -chdir=environments/production plan
```

No `cd` needed. You stay in one place and Terraform goes to the configuration.

### Using Absolute Paths

You can use absolute paths too, which is useful in scripts:

```bash
# Use an absolute path
terraform -chdir=/home/deploy/infra/environments/production apply

# This works from any directory
terraform -chdir=/opt/terraform/networking plan
```

### Scripting Multiple Applies

```bash
#!/bin/bash
# deploy-all.sh - Deploy all environments in sequence

INFRA_ROOT="/home/deploy/infra"
ENVIRONMENTS=("dev" "staging" "production")

for env in "${ENVIRONMENTS[@]}"; do
  echo "=== Deploying $env ==="

  # Init if needed
  terraform -chdir="$INFRA_ROOT/environments/$env" init -upgrade

  # Plan
  terraform -chdir="$INFRA_ROOT/environments/$env" plan -out=tfplan

  # Apply the saved plan
  terraform -chdir="$INFRA_ROOT/environments/$env" apply tfplan

  echo "=== $env deployment complete ==="
  echo ""
done
```

## How -chdir Affects File Paths

When you use `-chdir`, Terraform resolves all relative paths from the target directory, not from where you ran the command. This is important for things like variable files:

```bash
# Directory structure:
# infra/
#   environments/
#     production/
#       main.tf
#       production.tfvars
#   shared/
#     common.tfvars

# This works - production.tfvars is relative to the -chdir directory
terraform -chdir=environments/production plan -var-file=production.tfvars

# This does NOT work - common.tfvars is not in the production directory
terraform -chdir=environments/production plan -var-file=../../shared/common.tfvars
# Actually, this DOES work - relative paths from the -chdir directory are fine
```

Wait, let me clarify. The `-var-file` path is resolved relative to the `-chdir` directory. So if you want to reference a file outside that directory, you need to navigate up with `../`:

```bash
# Reference a shared tfvars file from the -chdir directory
terraform -chdir=environments/production plan \
  -var-file=production.tfvars \
  -var-file=../../shared/common.tfvars
```

Or use an absolute path:

```bash
# Absolute paths always work regardless of -chdir
terraform -chdir=environments/production plan \
  -var-file=/home/deploy/infra/shared/common.tfvars
```

## -chdir vs. the Old cd Approach

Before `-chdir`, the standard approach was wrapping everything in subshells:

```bash
# Old approach - using subshells
(cd environments/production && terraform plan)
(cd environments/staging && terraform plan)

# Or using pushd/popd
pushd environments/production
terraform plan
popd
```

The `-chdir` approach is cleaner for several reasons:

1. No subshell overhead
2. No risk of forgetting to `cd` back
3. Cleaner script output
4. Easier to combine with other flags

```bash
# Clean one-liner with -chdir
terraform -chdir=environments/production plan -out=tfplan

# Versus the old approach
(cd environments/production && terraform plan -out=tfplan)
```

## Working with Makefiles

`-chdir` works well with Makefiles for managing multiple configurations:

```makefile
# Makefile for managing Terraform environments

INFRA_DIR := environments
TF := terraform

# Generic targets that accept ENV parameter
.PHONY: init plan apply destroy

init:
	$(TF) -chdir=$(INFRA_DIR)/$(ENV) init -upgrade

plan:
	$(TF) -chdir=$(INFRA_DIR)/$(ENV) plan -out=tfplan

apply:
	$(TF) -chdir=$(INFRA_DIR)/$(ENV) apply tfplan

destroy:
	$(TF) -chdir=$(INFRA_DIR)/$(ENV) plan -destroy -out=destroy-plan
	$(TF) -chdir=$(INFRA_DIR)/$(ENV) apply destroy-plan

# Convenience targets for specific environments
.PHONY: plan-dev plan-staging plan-prod

plan-dev:
	$(MAKE) plan ENV=dev

plan-staging:
	$(MAKE) plan ENV=staging

plan-prod:
	$(MAKE) plan ENV=production

# Plan all environments
.PHONY: plan-all
plan-all: plan-dev plan-staging plan-prod
```

Usage:

```bash
# Plan production
make plan ENV=production

# Or use the convenience target
make plan-prod

# Plan all environments
make plan-all
```

## -chdir in CI/CD Pipelines

The `-chdir` flag simplifies CI/CD configurations, especially when you have a monorepo with multiple Terraform configurations:

```yaml
# .github/workflows/terraform.yml
name: Terraform CI

on:
  push:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      changed_dirs: ${{ steps.changes.outputs.dirs }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - id: changes
        run: |
          # Find which Terraform directories have changes
          DIRS=$(git diff --name-only HEAD~1 HEAD | grep '\.tf$' | xargs -I{} dirname {} | sort -u | jq -R -s -c 'split("\n")[:-1]')
          echo "dirs=$DIRS" >> $GITHUB_OUTPUT

  terraform:
    needs: detect-changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        dir: ${{ fromJson(needs.detect-changes.outputs.changed_dirs) }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform -chdir=${{ matrix.dir }} init

      - name: Terraform Plan
        run: terraform -chdir=${{ matrix.dir }} plan -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform -chdir=${{ matrix.dir }} apply tfplan
```

## Common Gotchas

### Backend Configuration

When using `-chdir`, the backend configuration is read from the target directory. Make sure each directory has its own backend config:

```hcl
# environments/production/backend.tf
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### Provider Lock Files

The `.terraform.lock.hcl` file is created in the target directory, not your current directory. This is usually what you want, since each configuration might use different provider versions.

### Terraform Data Directory

The `.terraform` directory (where providers and modules are cached) is also created in the target directory. If you run `terraform -chdir=environments/production init`, the `.terraform` folder appears in `environments/production/.terraform`.

### State File Location

For local state files, `terraform.tfstate` is created in the target directory:

```bash
# This creates environments/production/terraform.tfstate
terraform -chdir=environments/production apply -auto-approve
```

## Combining with Environment Variables

You can set a default `-chdir` path using the `TF_CLI_ARGS` environment variable:

```bash
# Set a default chdir for all commands in this shell session
export TF_CLI_ARGS="-chdir=environments/production"

# Now all terraform commands target the production directory
terraform init    # Runs in environments/production
terraform plan    # Runs in environments/production
terraform apply   # Runs in environments/production

# Unset when done
unset TF_CLI_ARGS
```

However, I would not recommend this approach for anything other than quick interactive sessions. In scripts, always be explicit with `-chdir` on each command for clarity.

## Summary

The `-chdir` flag is a small feature that makes a big difference in day-to-day Terraform workflows. It eliminates the need for directory navigation in scripts, simplifies Makefiles and CI/CD pipelines, and makes multi-environment management cleaner. The key thing to remember is that it must come before the subcommand, and all relative paths are resolved from the target directory.
