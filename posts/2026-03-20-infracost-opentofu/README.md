# How to Use Infracost for OpenTofu Cost Estimation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infracost, Cost Estimation, Infrastructure as Code, IaC, FinOps

Description: Learn how to integrate Infracost with OpenTofu for cloud cost estimation in CI/CD pull requests.

## Introduction

Learn how to integrate Infracost with OpenTofu for cloud cost estimation in CI/CD pull requests. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow.

## Prerequisites

- OpenTofu v1.6+ installed
- Infracost CLI installed
- Basic knowledge of OpenTofu concepts
- Relevant cloud credentials configured

## Step 1: Set Up the Environment

```bash
# Verify OpenTofu and Infracost installations

tofu version
infracost --version

# Authenticate Infracost
infracost auth login

# Set up common environment variables
export TF_INPUT=false  # Disable interactive input
export INFRACOST_API_KEY=your-api-key  # For non-interactive environments such as CI/CD

# Configure cloud credentials for tofu plan
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
# Initialize the project
tofu init

# Create a plan and save it
tofu plan -out=tfplan.binary -var-file=production.tfvars

# Convert the OpenTofu plan to JSON for Infracost
tofu show -json tfplan.binary > plan.json

# Estimate the monthly cost change
infracost diff --path plan.json
```

## Step 4: Set Up Automation

```yaml
# .github/workflows/infracost.yml
name: Infracost Cost Estimation

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  infracost:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.11.0"

      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: OpenTofu Init
        run: tofu init

      - name: OpenTofu Plan
        run: tofu plan -no-color -out=tfplan.binary -var-file=production.tfvars

      - name: Export OpenTofu Plan to JSON
        run: tofu show -json tfplan.binary > plan.json

      - name: Generate Infracost cost estimate
        run: infracost diff --path=plan.json --format=json --out-file=/tmp/infracost.json

      - name: Post Infracost comment
        run: |
          infracost comment github --path=/tmp/infracost.json \
                                   --repo=$GITHUB_REPOSITORY \
                                   --github-token=${{ github.token }} \
                                   --pull-request=${{ github.event.pull_request.number }} \
                                   --behavior=update
```

## Step 5: Monitor and Verify

```bash
# Review the current cost estimate
infracost diff --path plan.json

# Save machine-readable output for CI/CD systems
infracost diff --path plan.json --format json --out-file infracost.json

# Check for unsupported resources
infracost breakdown --path . --show-skipped

# Check for drift before generating a new plan JSON
tofu plan -refresh-only
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
2. Check provider credentials and Infracost authentication: Verify your cloud environment variables and `INFRACOST_API_KEY`
3. Review state consistency: Run `tofu plan -refresh-only`, then rerun `tofu plan -out=tfplan.binary -var-file=production.tfvars` and regenerate `plan.json` with `tofu show -json tfplan.binary > plan.json`
4. Check for unsupported resources: Run `infracost breakdown --path . --show-skipped`

## Conclusion

You have successfully implemented How to Use Infracost for OpenTofu Cost Estimation. This approach provides a repeatable, auditable, and collaborative cost estimation workflow for infrastructure changes before they are applied. Combine it with code review processes, automated testing, and proper access controls for a production-ready setup.
