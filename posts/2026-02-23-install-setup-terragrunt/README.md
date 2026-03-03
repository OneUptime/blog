# How to Install and Set Up Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Installation, Setup

Description: Learn how to install Terragrunt on macOS, Linux, and Windows, configure it for your Terraform project, set up remote state management, and organize a multi-environment directory structure.

---

Terragrunt is a thin wrapper around Terraform that simplifies working with multiple modules, managing remote state, and keeping configurations DRY. If you have ever copied the same backend configuration or provider blocks across dozens of Terraform modules, Terragrunt eliminates that pain. But before you can use it, you need to install it properly and understand how to structure your project.

This guide covers installing Terragrunt on all major platforms and setting up your first project with best practices.

## Prerequisites

Terragrunt requires Terraform to be installed first. Verify your Terraform installation:

```bash
# Check Terraform is installed
terraform version

# You should see output like:
# Terraform v1.7.0
```

If Terraform is not installed, grab it from [terraform.io](https://www.terraform.io/downloads) or use your package manager.

## Installing Terragrunt on macOS

The easiest way on macOS is Homebrew.

```bash
# Install Terragrunt with Homebrew
brew install terragrunt

# Verify the installation
terragrunt --version
# terragrunt version 0.54.0
```

If you need a specific version:

```bash
# Install a specific version with asdf
asdf plugin add terragrunt
asdf install terragrunt 0.54.0
asdf global terragrunt 0.54.0
```

## Installing Terragrunt on Linux

On Linux, download the binary directly or use a package manager.

```bash
# Option 1: Download the binary directly
TERRAGRUNT_VERSION="0.54.0"
curl -L "https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_amd64" \
  -o /usr/local/bin/terragrunt

# Make it executable
chmod +x /usr/local/bin/terragrunt

# Verify
terragrunt --version
```

For ARM-based systems (like AWS Graviton):

```bash
# Download the ARM64 binary
curl -L "https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_arm64" \
  -o /usr/local/bin/terragrunt

chmod +x /usr/local/bin/terragrunt
```

Using package managers:

```bash
# Ubuntu/Debian with the official repository
# (check Gruntwork docs for the latest instructions)
curl -L https://github.com/gruntwork-io/terragrunt/releases/download/v0.54.0/terragrunt_linux_amd64 -o terragrunt
sudo mv terragrunt /usr/local/bin/
sudo chmod +x /usr/local/bin/terragrunt

# With asdf version manager
asdf plugin add terragrunt
asdf install terragrunt 0.54.0
asdf global terragrunt 0.54.0
```

## Installing Terragrunt on Windows

On Windows, use Chocolatey or download the executable.

```powershell
# Option 1: Chocolatey
choco install terragrunt

# Option 2: Scoop
scoop install terragrunt

# Verify
terragrunt --version
```

## Project Directory Structure

Terragrunt projects follow a specific directory structure. The key idea is separating your Terraform modules (reusable code) from your live infrastructure (environment-specific configuration).

```text
infrastructure/
  # Reusable Terraform modules
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

  # Live infrastructure organized by environment
  live/
    # Root terragrunt.hcl with shared configuration
    terragrunt.hcl

    # Production environment
    production/
      env.hcl
      us-east-1/
        region.hcl
        vpc/
          terragrunt.hcl
        eks/
          terragrunt.hcl
        rds/
          terragrunt.hcl

    # Staging environment
    staging/
      env.hcl
      us-east-1/
        region.hcl
        vpc/
          terragrunt.hcl
        eks/
          terragrunt.hcl
```

## Creating the Root Configuration

The root `terragrunt.hcl` file contains shared configuration that all child modules inherit.

```hcl
# live/terragrunt.hcl

# Configure remote state backend
remote_state {
  backend = "s3"

  config = {
    # S3 bucket for state storage
    bucket         = "my-company-terraform-state"
    # Dynamic key based on the module path
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    # DynamoDB table for state locking
    dynamodb_table = "terraform-locks"
  }

  # Automatically create the S3 bucket and DynamoDB table if they don't exist
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

# Generate the provider configuration
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<EOF
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}
EOF
}
```

## Environment Configuration Files

Create environment-level configuration files that child modules can reference.

```hcl
# live/production/env.hcl

locals {
  environment = "production"
  account_id  = "123456789012"
}
```

```hcl
# live/production/us-east-1/region.hcl

locals {
  region = "us-east-1"
}
```

## Child Module Configuration

Each infrastructure component has its own `terragrunt.hcl` that references the Terraform module and provides inputs.

```hcl
# live/production/us-east-1/vpc/terragrunt.hcl

# Include the root configuration
include "root" {
  path = find_in_parent_folders()
}

# Read environment and region config
locals {
  env_config    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  region_config = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  environment   = local.env_config.locals.environment
  region        = local.region_config.locals.region
}

# Point to the Terraform module
terraform {
  source = "../../../../modules/vpc"
}

# Pass inputs to the module
inputs = {
  vpc_name   = "${local.environment}-vpc"
  cidr_block = "10.0.0.0/16"
  azs        = ["${local.region}a", "${local.region}b", "${local.region}c"]

  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  environment = local.environment
}
```

## Dependencies Between Modules

Terragrunt handles cross-module dependencies. If EKS needs the VPC ID, declare the dependency.

```hcl
# live/production/us-east-1/eks/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

locals {
  env_config  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_config.locals.environment
}

terraform {
  source = "../../../../modules/eks"
}

# Declare dependency on VPC
dependency "vpc" {
  config_path = "../vpc"

  # Mock outputs for plan when VPC hasn't been applied yet
  mock_outputs = {
    vpc_id          = "vpc-mock"
    private_subnets = ["subnet-mock-1", "subnet-mock-2"]
  }
}

inputs = {
  cluster_name = "${local.environment}-eks"
  # Use outputs from the VPC module
  vpc_id       = dependency.vpc.outputs.vpc_id
  subnet_ids   = dependency.vpc.outputs.private_subnets
  environment  = local.environment
}
```

## Running Terragrunt Commands

Terragrunt wraps Terraform commands with the same names.

```bash
# Initialize the module
cd live/production/us-east-1/vpc
terragrunt init

# Plan changes
terragrunt plan

# Apply changes
terragrunt apply

# Destroy resources
terragrunt destroy

# Run a command across all modules in a directory
cd live/production/us-east-1
terragrunt run-all plan

# Apply all modules in dependency order
terragrunt run-all apply

# Destroy all modules in reverse dependency order
terragrunt run-all destroy
```

## Generating Provider Blocks

Terragrunt can generate provider blocks so you do not need them in every module.

```hcl
# live/terragrunt.hcl

# Generate AWS provider with the correct region
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<EOF
provider "aws" {
  region = "${local.region}"

  default_tags {
    tags = {
      Environment = "${local.environment}"
      ManagedBy   = "terraform"
    }
  }
}
EOF
}
```

## Using External Modules

You can point Terragrunt to community modules from the Terraform Registry.

```hcl
# live/production/us-east-1/vpc/terragrunt.hcl

terraform {
  # Use a community module from the registry
  source = "tfr:///terraform-aws-modules/vpc/aws?version=5.4.0"
}

inputs = {
  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false
}
```

## Before and After Hooks

Run scripts before or after Terraform commands.

```hcl
# live/terragrunt.hcl

terraform {
  before_hook "validate" {
    commands = ["plan", "apply"]
    execute  = ["terraform", "validate"]
  }

  after_hook "notify" {
    commands     = ["apply"]
    execute      = ["bash", "-c", "echo 'Apply completed for ${path_relative_to_include()}'"]
    run_on_error = false
  }
}
```

## Version Pinning

Pin your Terragrunt version in the root config to ensure consistency.

```hcl
# live/terragrunt.hcl

terragrunt_version_constraint = ">= 0.54.0"

terraform_version_constraint = ">= 1.5.0"
```

## Useful Tips

Lock dependency versions to avoid surprises:

```bash
# Update the dependency lock file
terragrunt init -upgrade
```

Debug configuration issues:

```bash
# Show the generated Terraform configuration
terragrunt render-json

# Enable debug logging
TG_LOG=debug terragrunt plan

# Show the dependency graph
terragrunt graph-dependencies
```

Speed up operations:

```bash
# Run modules in parallel (default is 10)
terragrunt run-all apply --terragrunt-parallelism 20

# Skip auto-init
terragrunt plan --terragrunt-no-auto-init
```

## Best Practices

- Keep your root `terragrunt.hcl` minimal - just backend and provider configuration
- Use `env.hcl` and `region.hcl` files for environment-specific variables
- Pin module versions in the `source` attribute
- Use `mock_outputs` in dependencies for independent planning
- Run `terragrunt run-all plan` before `run-all apply` to review all changes
- Store Terragrunt configuration in the same repository as your Terraform modules
- Use `.terragrunt-cache` in `.gitignore` - it contains generated files
- Set `terragrunt_version_constraint` to prevent version drift across team members

For more on Terraform and infrastructure management, see our guide on [handling Kubernetes provider authentication in Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-provider-authentication-terraform/view).
