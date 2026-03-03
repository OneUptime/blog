# How to Use OpenTofu with Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Terragrunt, Infrastructure as Code, DRY

Description: Learn how to configure Terragrunt to use OpenTofu as its backend engine, covering configuration changes, DRY patterns, multi-account setups, and migration from Terraform-based Terragrunt workflows.

---

Terragrunt is a wrapper tool that adds features like DRY configuration, dependency management, and multi-account orchestration on top of Terraform or OpenTofu. If you are already using Terragrunt with Terraform and want to switch to OpenTofu, or if you are starting fresh, this guide covers everything you need.

## What Terragrunt Adds to OpenTofu

Terragrunt solves problems that OpenTofu does not address natively:

- **DRY backend configuration**: Define backend settings once, use everywhere
- **DRY provider configuration**: Share provider blocks across modules
- **Module dependencies**: Define execution order between independent modules
- **Multi-module orchestration**: Run commands across many modules at once
- **Before/after hooks**: Execute scripts before or after OpenTofu commands

## Configuring Terragrunt to Use OpenTofu

The key configuration is the `terraform_binary` setting. By default, Terragrunt looks for `terraform` in your PATH. To use OpenTofu:

```hcl
# terragrunt.hcl (root configuration)
terraform_binary = "tofu"
```

Or set it via environment variable:

```bash
# Environment variable approach
export TERRAGRUNT_TFPATH="tofu"

# Now all terragrunt commands use OpenTofu
terragrunt plan
terragrunt apply
```

Verify the configuration:

```bash
# Run a command and check which binary is used
terragrunt --version

# You should see both Terragrunt and OpenTofu versions
# Terragrunt v0.55.0
# OpenTofu v1.8.0
```

## Project Structure with Terragrunt

A typical Terragrunt project looks like this:

```text
infrastructure/
  terragrunt.hcl              # Root config (DRY backend, common settings)
  environments/
    staging/
      env.hcl                  # Staging-specific variables
      vpc/
        terragrunt.hcl         # VPC module config
      eks/
        terragrunt.hcl         # EKS module config (depends on VPC)
      rds/
        terragrunt.hcl         # RDS module config (depends on VPC)
    production/
      env.hcl                  # Production-specific variables
      vpc/
        terragrunt.hcl
      eks/
        terragrunt.hcl
      rds/
        terragrunt.hcl
  modules/
    vpc/
      main.tf
      variables.tf
      outputs.tf
    eks/
      main.tf
      variables.tf
      outputs.tf
    rds/
      main.tf
      variables.tf
      outputs.tf
```

## Root Terragrunt Configuration

The root `terragrunt.hcl` contains shared configuration:

```hcl
# infrastructure/terragrunt.hcl

# Use OpenTofu instead of Terraform
terraform_binary = "tofu"

# DRY backend configuration
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket         = "myorg-opentofu-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "opentofu-locks"
  }
}

# Generate provider configuration
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  default_tags {
    tags = {
      Environment = "${local.environment}"
      ManagedBy   = "opentofu"
      Project     = "infrastructure"
    }
  }
}
EOF
}

# Load environment-specific variables
locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_vars.locals.environment
  aws_region  = local.env_vars.locals.aws_region
}
```

## Environment Configuration

```hcl
# infrastructure/environments/staging/env.hcl
locals {
  environment = "staging"
  aws_region  = "us-east-1"
}
```

```hcl
# infrastructure/environments/production/env.hcl
locals {
  environment = "production"
  aws_region  = "us-east-1"
}
```

## Module Terragrunt Configuration

Each module directory has its own `terragrunt.hcl`:

```hcl
# infrastructure/environments/staging/vpc/terragrunt.hcl

# Include the root configuration
include "root" {
  path = find_in_parent_folders()
}

# Source the module
terraform {
  source = "../../../modules//vpc"
}

# Module inputs
inputs = {
  name             = "staging-vpc"
  cidr             = "10.0.0.0/16"
  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  enable_nat       = true
}
```

## Module Dependencies

Define dependencies between modules:

```hcl
# infrastructure/environments/staging/eks/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules//eks"
}

# Declare dependency on VPC
dependency "vpc" {
  config_path = "../vpc"

  # Mock outputs for plan when VPC has not been applied yet
  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

inputs = {
  cluster_name       = "staging-eks"
  cluster_version    = "1.28"
  vpc_id             = dependency.vpc.outputs.vpc_id
  subnet_ids         = dependency.vpc.outputs.private_subnet_ids
  node_instance_type = "t3.large"
  node_desired_count = 3
}
```

```hcl
# infrastructure/environments/staging/rds/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules//rds"
}

dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
}

dependency "eks" {
  config_path = "../eks"
  mock_outputs = {
    cluster_security_group_id = "sg-mock"
  }
}

inputs = {
  identifier     = "staging-db"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.medium"
  vpc_id         = dependency.vpc.outputs.vpc_id
  subnet_ids     = dependency.vpc.outputs.private_subnet_ids
  allowed_security_groups = [dependency.eks.outputs.cluster_security_group_id]
}
```

## Running Commands

Terragrunt wraps OpenTofu commands and adds orchestration:

```bash
# Run plan for a single module
cd infrastructure/environments/staging/vpc
terragrunt plan

# Run apply for a single module
terragrunt apply

# Run plan for ALL modules in an environment
cd infrastructure/environments/staging
terragrunt run-all plan

# Apply all modules (respecting dependency order)
terragrunt run-all apply

# Destroy all modules (in reverse dependency order)
terragrunt run-all destroy
```

## Before and After Hooks

Execute scripts around OpenTofu commands:

```hcl
# terragrunt.hcl
terraform {
  source = "../../../modules//vpc"

  before_hook "validate" {
    commands = ["plan", "apply"]
    execute  = ["tflint", "--init"]
  }

  after_hook "notify" {
    commands     = ["apply"]
    execute      = ["bash", "-c", "echo 'Applied successfully' | slack-notify"]
    run_on_error = false
  }
}
```

## Multi-Account Configuration

Manage multiple AWS accounts:

```hcl
# infrastructure/terragrunt.hcl

locals {
  account_vars = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  account_id   = local.account_vars.locals.account_id
  account_role = "arn:aws:iam::${local.account_id}:role/TerragruntRole"
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  assume_role {
    role_arn = "${local.account_role}"
  }
}
EOF
}
```

```hcl
# infrastructure/environments/staging/account.hcl
locals {
  account_id = "111111111111"
}
```

```hcl
# infrastructure/environments/production/account.hcl
locals {
  account_id = "222222222222"
}
```

## Migrating from Terraform-based Terragrunt

If you are already using Terragrunt with Terraform:

```bash
# Step 1: Install OpenTofu alongside Terraform
brew install opentofu

# Step 2: Update the root terragrunt.hcl
# Add: terraform_binary = "tofu"

# Step 3: Test with a non-production module
cd infrastructure/environments/staging/vpc
terragrunt plan

# Step 4: Verify no unexpected changes
# The plan should show "No changes" if state is compatible

# Step 5: Roll out to all modules
cd infrastructure/environments/staging
terragrunt run-all plan
```

## CI/CD with Terragrunt and OpenTofu

```yaml
# .github/workflows/terragrunt.yml
name: Terragrunt Deploy

on:
  push:
    branches: [main]

env:
  TERRAGRUNT_TFPATH: tofu
  TG_VERSION: "0.55.0"
  TOFU_VERSION: "1.8.0"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: ${{ env.TOFU_VERSION }}

      - name: Setup Terragrunt
        run: |
          curl -L "https://github.com/gruntwork-io/terragrunt/releases/download/v${TG_VERSION}/terragrunt_linux_amd64" -o /usr/local/bin/terragrunt
          chmod +x /usr/local/bin/terragrunt

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Plan
        run: |
          cd infrastructure/environments/production
          terragrunt run-all plan --terragrunt-non-interactive

      - name: Apply
        run: |
          cd infrastructure/environments/production
          terragrunt run-all apply --terragrunt-non-interactive
```

Terragrunt and OpenTofu complement each other well. OpenTofu handles the infrastructure provisioning, while Terragrunt handles the orchestration and DRY configuration that OpenTofu lacks natively. The switch from Terraform to OpenTofu in a Terragrunt setup is one of the simplest migrations because it is literally a single configuration change.

For OpenTofu-specific features, check out [How to Use OpenTofu Early Variable Evaluation](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-early-variable-evaluation/view).
