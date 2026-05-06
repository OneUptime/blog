# How to Use the -chdir Global Option in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the -chdir global option in OpenTofu to run commands against a configuration in a different directory without changing your current working directory.

## Introduction

The `-chdir` global option tells OpenTofu to switch to a specified directory before running the command. This is useful for running OpenTofu commands against configurations in other directories, building wrapper scripts, and orchestrating multi-configuration deployments from a central location.

## Basic Usage

```bash
# Run init in a specific directory

tofu -chdir=./infrastructure/networking init

# Plan from a different directory
tofu -chdir=./infrastructure/compute plan

# Apply without changing your working directory
tofu -chdir=./infrastructure/database apply -auto-approve
```

Note: `-chdir` is a global option that comes BEFORE the subcommand.

## Practical Applications

### Deploying Multiple Configurations from One Script

```bash
#!/bin/bash
# deploy-all.sh - run from project root

BASE_DIR="./infrastructure"

echo "Deploying networking..."
tofu -chdir="$BASE_DIR/networking" init
tofu -chdir="$BASE_DIR/networking" apply -auto-approve

echo "Deploying compute..."
tofu -chdir="$BASE_DIR/compute" init
tofu -chdir="$BASE_DIR/compute" apply -auto-approve

echo "Deploying database..."
tofu -chdir="$BASE_DIR/database" init
tofu -chdir="$BASE_DIR/database" apply -auto-approve

echo "All deployments complete!"
```

### CI/CD Without Workspace Changes

```yaml
# GitHub Actions: deploy multiple configs
jobs:
  deploy-networking:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Networking
        run: |
          tofu -chdir=infrastructure/networking init
          tofu -chdir=infrastructure/networking apply -auto-approve

  deploy-compute:
    needs: deploy-networking
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Compute
        run: |
          tofu -chdir=infrastructure/compute init
          tofu -chdir=infrastructure/compute apply -auto-approve
```

### Monorepo Support

```bash
# Repository structure:
# monorepo/
# ├── services/
# │   ├── auth-service/
# │   │   └── infrastructure/  ← OpenTofu configs
# │   └── payment-service/
# │       └── infrastructure/
# └── platform/
#     ├── networking/
#     └── kubernetes/

# Deploy from repository root
tofu -chdir=services/auth-service/infrastructure plan
tofu -chdir=services/payment-service/infrastructure plan
tofu -chdir=platform/networking plan
```

## Path Resolution with -chdir

When `-chdir` is used, OpenTofu treats the specified directory as the root module directory for the command. In configuration, prefer `path.root` or `path.module` for filesystem paths; `path.cwd` still refers to the original working directory where you ran `tofu`:

```hcl
# networking/main.tf
module "subnet" {
  source = "./modules/subnet"  # Resolved relative to the current module directory
}

# File references
locals {
  user_data = file("${path.module}/scripts/init.sh")  # Current module directory
}
```

## Combining with Backend Config

```bash
# Use -chdir with backend config file
tofu -chdir=./infrastructure/prod \
  init -backend-config=../../backends/prod.hcl
```

## -chdir vs cd

```bash
# Using cd (changes working directory)
cd ./infrastructure/networking
tofu init
tofu plan

# Using -chdir (doesn't change working directory)
tofu -chdir=./infrastructure/networking init
tofu -chdir=./infrastructure/networking plan
# You're still in the original directory after these commands
```

The `-chdir` approach is cleaner in scripts as it doesn't change the shell's working directory.

## Conclusion

The `-chdir` global option enables clean, location-independent OpenTofu operations. Use it in orchestration scripts, CI/CD pipelines, and Makefile targets to manage multiple configurations from a central location without changing directories. It's particularly valuable in monorepos and multi-configuration setups where you need to orchestrate deployments across multiple OpenTofu configurations from a single script.
