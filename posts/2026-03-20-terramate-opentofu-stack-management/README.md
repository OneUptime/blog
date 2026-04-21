# How to Use Terramate with OpenTofu for Stack Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terramate, Stack Management, Infrastructure as Code, GitOps, DevOps

Description: Learn how to use Terramate to organize OpenTofu configurations into stacks, detect changed stacks, and orchestrate apply operations across a large monorepo.

## Introduction

Terramate is an orchestration tool for OpenTofu and Terraform that introduces the concept of "stacks" - self-contained units of infrastructure. Its killer feature is change detection: when you open a pull request, you can configure Terramate to run `tofu plan` only on the stacks that were actually modified, making large monorepos practical.

## Installing Terramate

```bash
# macOS

brew install terramate

# Ubuntu/Debian Linux
echo "deb [trusted=yes] https://repo.terramate.io/apt/ /" \
  | sudo tee /etc/apt/sources.list.d/terramate.list
sudo apt update
sudo apt install -y terramate

# Verify
terramate version
```

## Initializing a Terramate Project

```bash
# Create an optional root Terramate config
cat > terramate.tm.hcl <<'EOF'
terramate {
  config {}
}
EOF
```

## Running OpenTofu Commands

Terramate does not require a Terraform binary override. It runs the command you pass after `--`, so use `tofu` directly:

```bash
terramate run -- tofu init
terramate run -- tofu plan
```

## Creating Stacks

Each stack is a directory with a `stack.tm.hcl` file:

```bash
# Create stacks for different environments/components
terramate create stacks/networking --description "VPC, subnets, and routing"
terramate create stacks/eks-cluster
terramate create stacks/rds
```

This generates a `stack.tm.hcl` in each directory:

```hcl
# stacks/networking/stack.tm.hcl - auto-generated
stack {
  name        = "networking"
  description = "VPC, subnets, and routing"
  id          = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## Generating Shared Configuration

Terramate's code generation injects common config (like backend or provider) into every stack:

```hcl
# terramate.tm.hcl (root) - generate backend.tf in all stacks
generate_hcl "backend.tf" {
  content {
    terraform {
      backend "s3" {
        bucket         = "my-opentofu-state"
        key            = "${terramate.stack.path.relative}/tofu.tfstate"
        region         = "us-east-1"
        dynamodb_table = "opentofu-locks"
        encrypt        = true
      }
    }
  }
}
```

After changing the generation config, regenerate files:

```bash
terramate generate
```

## Detecting Changed Stacks

Terramate uses Git change detection to find stacks with modified files. You can set the comparison base explicitly with `--git-change-base`:

```bash
# List stacks changed compared to main
terramate list --changed --git-change-base origin/main

# Run tofu plan only on changed stacks
terramate run --changed --git-change-base origin/main -- tofu plan

# Run tofu apply on changed stacks
terramate run --changed --git-change-base origin/main -- tofu apply -auto-approve
```

## CI/CD Integration

```yaml
# .github/workflows/opentofu.yml
name: OpenTofu Changed Stacks

on:
  pull_request:

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # Required for change detection

      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_wrapper: false

      - name: Install Terramate
        run: |
          echo "deb [trusted=yes] https://repo.terramate.io/apt/ /" \
            | sudo tee /etc/apt/sources.list.d/terramate.list
          sudo apt update
          sudo apt install -y terramate

      - name: Initialize changed stacks
        run: terramate run --changed --git-change-base origin/${{ github.base_ref }} -- tofu init

      - name: Plan changed stacks
        run: terramate run --changed --git-change-base origin/${{ github.base_ref }} -- tofu plan
```

## Conclusion

Terramate makes large-scale OpenTofu monorepos manageable by treating each component as an isolated stack and only operating on what changed. Combined with code generation for shared backend and provider config, it provides a clean alternative to Terragrunt for teams who prefer Terramate's stack-centric model.
