# How to Use Variable Files Per Environment in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Environment Management, tfvars, Infrastructure as Code, DevOps

Description: Learn how to organize OpenTofu variable files for multiple environments (development, staging, production) with a consistent, maintainable structure.

---

Using per-environment variable files is the standard approach for managing configuration differences between development, staging, and production in OpenTofu. The same configuration files work across all environments - only the variable values change.

---

## Recommended File Structure

```text
infrastructure/
├── main.tf               # resources (unchanged across environments)
├── variables.tf          # variable declarations (unchanged across environments)
├── outputs.tf
├── versions.tf
├── envs/
│   ├── dev.tfvars        # development values
│   ├── staging.tfvars    # staging values
│   └── prod.tfvars       # production values
└── .gitignore            # ignore secrets files
```

---

## Variable Declarations (Shared)

```hcl
# variables.tf - one file for all environments

variable "environment" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "enable_deletion_protection" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

---

## Per-Environment .tfvars Files

```hcl
# envs/dev.tfvars

environment                = "development"
instance_type              = "t3.micro"
instance_count             = 1
enable_deletion_protection = false

tags = {
  Environment = "development"
  CostCenter  = "engineering-dev"
}
```

```hcl
# envs/staging.tfvars
environment                = "staging"
instance_type              = "t3.small"
instance_count             = 2
enable_deletion_protection = false

tags = {
  Environment = "staging"
  CostCenter  = "engineering-staging"
}
```

```hcl
# envs/prod.tfvars
environment                = "production"
instance_type              = "m5.large"
instance_count             = 5
enable_deletion_protection = true

tags = {
  Environment = "production"
  CostCenter  = "engineering-prod"
  Criticality = "high"
}
```

---

## Deploying to Each Environment

```bash
# Deploy to development
tofu plan -var-file="envs/dev.tfvars"
tofu apply -var-file="envs/dev.tfvars"

# Deploy to staging
tofu plan -var-file="envs/staging.tfvars"
tofu apply -var-file="envs/staging.tfvars"

# Deploy to production (with manual approval)
tofu plan -var-file="envs/prod.tfvars"
tofu apply -var-file="envs/prod.tfvars"
```

---

## CI/CD Pipeline with Per-Environment Files

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
      - run: |
          tofu init
          tofu apply -var-file="envs/dev.tfvars" -auto-approve

  deploy-staging:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
      - run: |
          tofu init
          tofu apply -var-file="envs/staging.tfvars" -auto-approve

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # requires manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
      - run: |
          tofu init
          tofu apply -var-file="envs/prod.tfvars" -auto-approve
```

---

## Separate State Files Per Environment

Each environment should have its own state file to prevent cross-environment interference.

```hcl
# backend.tf - workspaces automatically namespace state per environment
terraform {
  backend "s3" {
    bucket               = "my-terraform-state"
    key                  = "infra/terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "infra"
  }
}
```

Backend configuration blocks do not support interpolation, so `${terraform.workspace}` cannot be used directly in `key`. Instead, the S3 backend automatically stores each workspace's state at `<workspace_key_prefix>/<workspace_name>/<key>` (the default prefix is `env:`).

```bash
# Use workspaces for state isolation
tofu workspace new dev
tofu workspace new staging
tofu workspace new prod

# Deploy to the correct workspace
tofu workspace select prod
tofu apply -var-file="envs/prod.tfvars"
```

---

## Summary

Per-environment `.tfvars` files keep your infrastructure configuration DRY by sharing a single set of `.tf` files while varying only the values. Use a consistent naming convention (`dev.tfvars`, `staging.tfvars`, `prod.tfvars`), pair each environment with a separate state backend key or workspace, and use CI/CD environments with manual approval gates between staging and production.
