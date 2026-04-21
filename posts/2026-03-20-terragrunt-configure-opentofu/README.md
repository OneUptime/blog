# How to Configure Terragrunt to Use OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Configuration, Infrastructure as Code, DevOps

Description: Learn how to configure Terragrunt to invoke OpenTofu instead of Terraform, enabling DRY infrastructure management with the open-source OpenTofu toolchain.

## Introduction

Terragrunt is a thin wrapper around OpenTofu (and Terraform) that provides extra tools for keeping your configurations DRY. Since OpenTofu is a drop-in replacement for Terraform, Terragrunt works with it by invoking the `tofu` binary. Current Terragrunt releases default to `tofu`, and the settings below make that choice explicit.

## Installing Prerequisites

```bash
# Install OpenTofu

brew install opentofu    # macOS
# or follow https://opentofu.org/docs/intro/install/

# Install Terragrunt
brew install terragrunt  # macOS
# or follow https://docs.terragrunt.com/getting-started/install/

# Verify both are installed
tofu version
terragrunt --version
```

## Configuring Terragrunt to Use OpenTofu

Terragrunt respects the `TG_TF_PATH` environment variable to override which binary it calls:

```bash
# Use tofu for all terragrunt commands in this shell session
export TG_TF_PATH=$(which tofu)

# Verify
terragrunt info print
# The terraform_binary field should point to tofu
```

## Permanent Configuration via root.hcl

You can hard-code the OpenTofu binary name or path in your root `root.hcl`:

```hcl
# root.hcl
# Tell Terragrunt to use OpenTofu instead of Terraform
terraform_binary = "tofu"

# Remote state backend configuration shared across all modules
remote_state {
  backend = "s3"
  config = {
    bucket         = "my-opentofu-state"
    key            = "${path_relative_to_include()}/tofu.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "opentofu-state-locks"
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

# Provider configuration injected into all modules
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
EOF
}
```

## Project Layout

A typical Terragrunt project using OpenTofu looks like this:

```text
infrastructure/
├── root.hcl                # Root config (sets terraform_binary = "tofu")
├── common_vars.yaml        # Shared variables
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── eks/
│       ├── main.tf
│       └── ...
└── environments/
    ├── dev/
    │   └── vpc/
    │       └── terragrunt.hcl
    └── prod/
        └── vpc/
            └── terragrunt.hcl
```

## Child terragrunt.hcl Example

```hcl
# environments/dev/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/vpc"
}

inputs = {
  vpc_cidr    = "10.0.0.0/16"
  aws_region  = "us-east-1"
  environment = "dev"
}
```

## Running Terragrunt Commands

```bash
# Plan a single module
terragrunt plan

# Apply a single module
terragrunt apply

# Run across all modules in the environment
terragrunt run --all plan

# Apply all modules respecting dependency order
terragrunt run --all apply
```

## CI/CD Integration

```yaml
# .github/workflows/infra.yml
- name: Install Terragrunt and OpenTofu
  uses: gruntwork-io/terragrunt-action@v3
  with:
    tg_version: "1.0.2"
    tofu_version: "1.11.6"

- name: Terragrunt Plan
  env:
    TG_TF_PATH: tofu
    TG_NON_INTERACTIVE: "true"
  run: terragrunt run --all plan
```

## Conclusion

Configuring Terragrunt to use OpenTofu is straightforward - set `terraform_binary = "tofu"` in your root `root.hcl` or export `TG_TF_PATH`. From there, all Terragrunt features like DRY backends, dependency management, and `run --all` work seamlessly with OpenTofu.
