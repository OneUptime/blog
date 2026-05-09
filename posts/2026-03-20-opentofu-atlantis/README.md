# How to Set Up OpenTofu with Atlantis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Atlantis, CI/CD, Infrastructure as Code, IaC, GitOps

Description: Learn how to configure Atlantis for automated OpenTofu plan and apply from pull request comments.

## Introduction

Learn how to configure Atlantis for automated OpenTofu plan and apply from pull request comments. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow.

## Prerequisites

- OpenTofu v1.6+ installed
- Basic knowledge of OpenTofu concepts
- Relevant cloud credentials configured

## Step 1: Set Up the Environment

```bash
# Verify OpenTofu installation

tofu version

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
# Initialize the project
tofu init -backend-config=backend.tfvars

# Create a plan and save it
tofu plan -out=tfplan -var-file=production.tfvars

# Review the plan
tofu show tfplan

# Apply the saved plan
tofu apply tfplan
```

## Step 4: Set Up Automation with Atlantis

Atlantis is a self-hosted server that listens for pull request events from GitHub, GitLab, or Bitbucket and runs OpenTofu commands when triggered by PR comments. It posts plan and apply output back to the PR, providing a GitOps workflow for infrastructure changes.

### Run the Atlantis Server

The fastest way to get Atlantis running is with the official Docker image:

```bash
docker run -d -p 4141:4141 \
  --name atlantis \
  -e ATLANTIS_GH_USER=your-github-bot-user \
  -e ATLANTIS_GH_TOKEN=ghp_your_token \
  -e ATLANTIS_GH_WEBHOOK_SECRET=your-webhook-secret \
  -e ATLANTIS_REPO_ALLOWLIST="github.com/your-org/*" \
  -e ATLANTIS_DEFAULT_TF_DISTRIBUTION=opentofu \
  -e ATLANTIS_DEFAULT_TF_VERSION=1.7.0 \
  -e ATLANTIS_ATLANTIS_URL=https://atlantis.example.com \
  ghcr.io/runatlantis/atlantis:latest
```

Setting `ATLANTIS_DEFAULT_TF_DISTRIBUTION=opentofu` tells Atlantis to download and execute the OpenTofu binary instead of Terraform.

### Configure the GitHub Webhook

In your GitHub repository or organization settings, add a webhook:

- Payload URL: `https://atlantis.example.com/events`
- Content type: `application/json`
- Secret: matches `ATLANTIS_GH_WEBHOOK_SECRET`
- Events: select `Pull request reviews`, `Pushes`, `Issue comments`, and `Pull requests`

### Add atlantis.yaml to Your Repository

Commit this file at the repo root so Atlantis knows which projects to track and which OpenTofu version to use:

```yaml
# atlantis.yaml
version: 3
projects:
  - name: production
    dir: .
    workspace: default
    terraform_distribution: opentofu
    terraform_version: v1.7.0
    autoplan:
      when_modified: ["*.tf", "*.tfvars"]
      enabled: true
    apply_requirements: [approved, mergeable]
```

With `autoplan.enabled: true`, Atlantis runs `tofu plan` automatically whenever a PR modifies a matching file. The `apply_requirements` setting blocks `atlantis apply` until the PR is approved and mergeable.

### Use Atlantis from Pull Requests

Once configured, trigger Atlantis with PR comments:

- `atlantis plan` - run a plan and post the output to the PR
- `atlantis plan -- -var-file=staging.tfvars` - pass extra args through to `tofu plan`
- `atlantis apply` - apply the most recent plan
- `atlantis unlock` - remove all locks for the PR
- `atlantis help` - show available commands

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
3. Review state consistency: Run `tofu refresh` then `tofu plan`
4. Consult provider documentation for service-specific errors

## Conclusion

You have successfully implemented How to Set Up OpenTofu with Atlantis. This approach provides a repeatable, auditable, and collaborative infrastructure management workflow. Combine with code review processes, automated testing, and proper access controls for a production-ready setup.
