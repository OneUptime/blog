# How to Use Terramate with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terramate, Infrastructure as Code, IaC, Stack, GitOps

Description: Learn how to use Terramate to orchestrate OpenTofu stacks with change detection and dependency management.

## Introduction

Learn how to use Terramate to orchestrate OpenTofu stacks with change detection and dependency management. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow.

## Prerequisites

- OpenTofu v1.6+ installed
- Terramate CLI installed
- Basic knowledge of OpenTofu concepts
- Relevant cloud credentials configured

## Step 1: Set Up the Environment

```bash
# Verify OpenTofu installation
tofu version

# Verify Terramate installation
terramate version

# Set up required environment variables
export TF_LOG=INFO  # Enable logging
export TF_INPUT=false  # Disable interactive input

# Configure cloud credentials
# AWS
export AWS_PROFILE=your-profile
# Azure
export ARM_SUBSCRIPTION_ID=your-subscription-id
# GCP
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Step 2: Configure Your OpenTofu Project

```hcl
# main.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state backend for team collaboration
  backend "s3" {
    bucket         = "my-opentofu-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy   = "OpenTofu"
      Environment = var.environment
      Repository  = var.repository_url
    }
  }
}
```

## Step 3: Implement the Core Feature

```bash
# Import existing OpenTofu root modules as Terramate stacks
terramate create --all-terraform

# List detected stacks
terramate list

# Initialize each stack
terramate run -- tofu init -backend-config=backend.tfvars

# Create a plan for changed stacks and their dependencies
terramate run --changed --include-all-dependencies -- tofu plan -out=tfplan -var-file=production.tfvars

# Review the saved plans
terramate run --changed --include-all-dependencies -- tofu show tfplan

# Apply the saved plans
terramate run --changed --include-all-dependencies -- tofu apply tfplan
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
  pull-requests: read

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Setup Terramate
        uses: terramate-io/terramate-action@v3
        with:
          version: "0.16.0"

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.7.0"
          tofu_wrapper: false

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terramate Init
        run: terramate run --changed --include-all-dependencies -- tofu init

      - name: Terramate Plan
        run: terramate run --changed --include-all-dependencies -- tofu plan -no-color -out=tfplan

      - name: Upload Plan
        uses: actions/upload-artifact@v7
        with:
          name: tfplans
          path: "**/tfplan"

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Setup Terramate
        uses: terramate-io/terramate-action@v3
        with:
          version: "0.16.0"

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.7.0"
          tofu_wrapper: false

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Download Plan
        uses: actions/download-artifact@v8
        with:
          name: tfplans

      - name: Terramate Init
        run: terramate run --changed --include-all-dependencies -- tofu init

      - name: Terramate Apply
        run: terramate run --changed --include-all-dependencies -- tofu apply tfplan
```

## Step 5: Monitor and Verify

```bash
# Check current state
terramate run -- tofu show

# List all managed resources
terramate run -- tofu state list

# Verify resource configuration
terramate run -- tofu state show RESOURCE_ADDRESS

# Check for drift
terramate run -- tofu plan -refresh-only
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
3. Review state consistency: Run `terramate run -- tofu apply -refresh-only` then `terramate run -- tofu plan`
4. Consult provider documentation for service-specific errors

## Conclusion

You have successfully implemented How to Use Terramate with OpenTofu. This approach provides a repeatable, auditable, and collaborative infrastructure management workflow. Combine with code review processes, automated testing, and proper access controls for a production-ready setup.
