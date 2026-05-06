# How to Use Checkov for OpenTofu Security Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Checkov, Security Scanning, Infrastructure as Code, IaC, DevSecOps

Description: Learn how to use Checkov to scan OpenTofu configurations for security misconfigurations and compliance violations.

## Introduction

Learn how to use Checkov to scan OpenTofu configurations for security misconfigurations and compliance violations. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow.

## Prerequisites

- Checkov installed
- OpenTofu v1.6+ installed if you want to scan a generated plan file
- Basic knowledge of OpenTofu concepts
- Relevant cloud credentials configured if you plan to run `tofu plan`

## Step 1: Set Up the Environment

```bash
# Install Checkov
pip3 install checkov
# or
brew install checkov

# Verify Checkov installation
checkov --version

# Optional: verify OpenTofu if you plan to scan a generated plan file
tofu version

# Optional: enable verbose Checkov logs while troubleshooting
export LOG_LEVEL=DEBUG

# Configure cloud credentials only if you plan to generate and scan a plan file
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
}

provider "aws" {
  region = "us-east-1"
}

# This example intentionally omits versioning and encryption
# so Checkov has findings to report.
resource "aws_s3_bucket" "example" {
  bucket = "replace-with-a-unique-bucket-name"
}
```

## Step 3: Implement the Core Feature

```bash
# Initialize the project for validation
tofu init -backend=false

# Validate the configuration
tofu validate

# Scan OpenTofu source files with Checkov
# Checkov scans OpenTofu HCL by using the Terraform framework.
checkov -d . --framework terraform

# Optional: scan a generated plan file for more context-aware results
# Plan JSON can include sensitive values, so keep it in a secure environment.
tofu plan -out=tfplan
tofu show -json tfplan > tfplan.json
checkov -f tfplan.json --repo-root-for-plan-enrichment .
```

## Step 4: Set Up Automation

```yaml
# .github/workflows/checkov.yml
name: Checkov OpenTofu Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: .
          framework: terraform
          output_format: cli
```

## Step 5: Monitor and Verify

```bash
# Show only failed checks without code blocks
checkov -d . --framework terraform --quiet --compact

# Export results as JSON for CI systems or custom tooling
checkov -d . --framework terraform -o json

# Re-scan a generated plan file with source enrichment
checkov -f tfplan.json --repo-root-for-plan-enrichment .
```

## Step 6: Implement Best Practices

```hcl
resource "aws_s3_bucket" "example" {
  bucket = "replace-with-a-unique-bucket-name"
}

resource "aws_s3_bucket_versioning" "example" {
  bucket = aws_s3_bucket.example.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "example" {
  bucket = aws_s3_bucket.example.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

## Troubleshooting

If you encounter issues:

1. Verify Checkov installation: Run `checkov --version`
2. If you use external modules, enable module downloads: Run `checkov -d . --download-external-modules True`
3. For plan scanning, create JSON output first: Run `tofu show -json tfplan > tfplan.json`
4. Review any skipped checks carefully and use suppressions only with documented justification

## Conclusion

You have successfully implemented Checkov scanning for OpenTofu configurations. This approach helps you catch security misconfigurations in source files and optional plan output before applying infrastructure changes. Combine it with code review processes and CI automation for a stronger DevSecOps workflow.
