# How to Use Trivy for OpenTofu Security Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Trivy, Security Scanning, Infrastructure as Code, IaC, DevSecOps

Description: Learn how to use Trivy to scan OpenTofu IaC files for security vulnerabilities and compliance issues.

## Introduction

Learn how to use Trivy to scan OpenTofu IaC files for security misconfigurations and exposed secrets. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow.

## Prerequisites

- OpenTofu v1.6+ installed
- Trivy installed
- Basic knowledge of OpenTofu concepts
- Relevant cloud credentials configured

## Step 1: Set Up the Environment

```bash
# Verify OpenTofu installation

tofu version

# Verify Trivy installation
trivy --version

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

## Step 3: Scan OpenTofu Configuration and Plans

```bash
# Scan OpenTofu HCL files for security misconfigurations and secrets
trivy config --severity HIGH,CRITICAL --exit-code 1 .

# Use tfvars when Trivy needs environment-specific variable values
trivy config --tf-vars production.tfvars --severity HIGH,CRITICAL --exit-code 1 .

# Initialize the project
tofu init -backend-config=backend.tfvars

# Create a plan and save it
tofu plan -out=tfplan -var-file=production.tfvars

# Convert the saved plan to JSON and scan it with Trivy
# Keep tfplan and tfplan.json private because plan data can contain sensitive values
tofu show -json tfplan > tfplan.json
trivy config --severity HIGH,CRITICAL --exit-code 1 tfplan.json

# Review the plan before applying it
tofu show tfplan

# Apply the saved plan
tofu apply tfplan
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
  pull-requests: write
  security-events: write

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: Trivy OpenTofu Config Scan
        uses: aquasecurity/trivy-action@0.35.0
        with:
          scan-type: "config"
          hide-progress: true
          format: "sarif"
          output: "trivy-config-results.sarif"
          exit-code: "1"
          severity: "CRITICAL,HIGH"

      - name: Upload Trivy Config Results
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: "trivy-config-results.sarif"

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: OpenTofu Init
        run: tofu init

      - name: OpenTofu Plan
        run: tofu plan -no-color -out=tfplan

      - name: Convert Plan to JSON
        run: tofu show -json tfplan > tfplan.json

      - name: Trivy OpenTofu Plan Scan
        uses: aquasecurity/trivy-action@0.35.0
        with:
          scan-type: "config"
          scan-ref: "tfplan.json"
          hide-progress: true
          format: "sarif"
          output: "trivy-plan-results.sarif"
          exit-code: "1"
          severity: "CRITICAL,HIGH"

      - name: Upload Trivy Plan Results
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: "trivy-plan-results.sarif"

      - name: Upload Plan
        uses: actions/upload-artifact@v7
        with:
          name: tfplan
          path: tfplan
          retention-days: 1

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v5

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Download Plan
        uses: actions/download-artifact@v8
        with:
          name: tfplan

      - name: OpenTofu Init
        run: tofu init

      - name: OpenTofu Apply
        run: tofu apply tfplan
```

## Step 5: Monitor and Verify

```bash
# Check current state
tofu show

# List all managed resources
tofu state list

# Verify resource configuration
tofu state show aws_instance.main

# Check for drift
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
2. Check provider credentials: Verify environment variables
3. Review state consistency: Run `tofu plan -refresh-only`, then `tofu apply -refresh-only` only after reviewing the proposed state update
4. Consult provider documentation for service-specific errors

## Conclusion

You have successfully implemented Trivy security scanning for OpenTofu. This approach provides a repeatable, auditable, and collaborative infrastructure management workflow. Combine with code review processes, automated testing, and proper access controls for a production-ready setup.
