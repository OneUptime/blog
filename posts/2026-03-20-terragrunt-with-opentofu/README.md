# How to Use Terragrunt with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Infrastructure as Code, IaC, DRY, Multi-Environment

Description: Learn how to use Terragrunt to keep OpenTofu configurations DRY with remote state, dependencies, and inputs.

## Introduction

Learn how to use Terragrunt to keep OpenTofu configurations DRY with remote state, dependencies, and inputs. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow.

## Prerequisites

- OpenTofu v1.6+ installed
- Terragrunt v1.0+ installed
- Basic knowledge of OpenTofu concepts
- Relevant cloud credentials configured

## Step 1: Set Up the Environment

```bash
# Verify OpenTofu installation

tofu version

# Verify Terragrunt installation
terragrunt --version

# Set up required environment variables
export TF_LOG=INFO  # Enable logging
export TF_INPUT=false  # Disable interactive input

# Configure AWS credentials for the examples below
export AWS_PROFILE=your-profile
```

## Step 2: Configure Your OpenTofu Project

```hcl
# root.hcl
locals {
  aws_region     = "us-east-1"
  environment    = "production"
  repository_url = "https://github.com/example/infrastructure"
}

remote_state {
  backend = "s3"

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }

  config = {
    bucket         = "my-opentofu-state"
    key            = "${path_relative_to_include()}/tofu.tfstate"
    region         = local.aws_region
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<EOF
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${local.aws_region}"

  default_tags {
    tags = {
      ManagedBy   = "OpenTofu"
      Environment = "${local.environment}"
      Repository  = "${local.repository_url}"
    }
  }
}
EOF
}

# live/production/app/terragrunt.hcl
include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "../../../modules/app"
}

dependency "network" {
  config_path = "../network"

  mock_outputs = {
    vpc_id = "vpc-00000000000000000"
  }

  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

inputs = {
  environment = include.root.locals.environment
  vpc_id      = dependency.network.outputs.vpc_id
}

# modules/app/variables.tf
variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID from the network dependency"
  type        = string
}
```

## Step 3: Implement the Core Feature

```bash
# Move into the Terragrunt unit
cd live/production/app

# Initialize the project and generated backend
terragrunt init

# Create a plan and save it
terragrunt run -- plan -out=/tmp/tfplan

# Review the plan
terragrunt run -- show /tmp/tfplan

# Apply the saved plan
terragrunt run -- apply /tmp/tfplan
```

## Step 4: Set Up Automation

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  plan:
    runs-on: ubuntu-latest
    env:
      TG_WORKING_DIR: live/production/app
    steps:
      - uses: actions/checkout@v6

      - name: Install Terragrunt and OpenTofu
        uses: gruntwork-io/terragrunt-action@v3
        with:
          tg_version: "1.0.0"
          tofu_version: "1.11.6"

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6.1.0
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terragrunt Init
        working-directory: ${{ env.TG_WORKING_DIR }}
        run: terragrunt init

      - name: Terragrunt Plan
        working-directory: ${{ env.TG_WORKING_DIR }}
        run: terragrunt run -- plan -no-color

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    env:
      TG_WORKING_DIR: live/production/app
    steps:
      - uses: actions/checkout@v6

      - name: Install Terragrunt and OpenTofu
        uses: gruntwork-io/terragrunt-action@v3
        with:
          tg_version: "1.0.0"
          tofu_version: "1.11.6"

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6.1.0
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terragrunt Init
        working-directory: ${{ env.TG_WORKING_DIR }}
        run: terragrunt init

      - name: Terragrunt Apply
        working-directory: ${{ env.TG_WORKING_DIR }}
        run: terragrunt run -- apply -auto-approve
```

## Step 5: Monitor and Verify

```bash
# Move into the Terragrunt unit
cd live/production/app

# Check current state
terragrunt run -- show

# List all managed resources
terragrunt run -- state list

# Verify resource configuration
terragrunt run -- state show aws_instance.main

# Check for drift
terragrunt run -- plan -refresh-only
```

## Step 6: Implement Best Practices

```hcl
# Use locals for computed values
locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "OpenTofu"
    Owner       = var.team_email
  }
}

# Use validation for variables
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}
```

## Troubleshooting

If you encounter issues:

1. Enable debug logging: `export TF_LOG=DEBUG`
2. Check provider credentials: Verify environment variables
3. Review state consistency: Run `terragrunt run -- plan -refresh-only` before `terragrunt run -- plan`
4. Consult provider documentation for service-specific errors

## Conclusion

You have successfully implemented How to Use Terragrunt with OpenTofu. This approach provides a repeatable, auditable, and collaborative infrastructure management workflow. Combine with code review processes, automated testing, and proper access controls for a production-ready setup.
