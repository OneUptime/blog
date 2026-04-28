# How to Set Up OpenTofu with GitLab CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitLab, CI/CD, Infrastructure as Code, IaC, DevOps

Description: Learn how to configure GitLab CI/CD pipelines with OpenTofu for automated infrastructure deployments and approvals.

## Introduction

Learn how to configure GitLab CI/CD pipelines with OpenTofu for automated infrastructure deployments and approvals. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow.

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

## Step 4: Set Up Automation

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - plan
  - apply

variables:
  TF_ROOT: ${CI_PROJECT_DIR}
  TF_LOG: INFO
  TF_INPUT: "false"
  TF_IN_AUTOMATION: "true"

default:
  image:
    name: ghcr.io/opentofu/opentofu:1.7.0
    entrypoint: [""]
  before_script:
    - cd "${TF_ROOT}"
    - tofu --version
    - tofu init -input=false

validate:
  stage: validate
  script:
    - tofu fmt -check -recursive
    - tofu validate

plan:
  stage: plan
  script:
    - tofu plan -no-color -out=tfplan
    - tofu show -no-color tfplan
  artifacts:
    paths:
      - tfplan
    expire_in: 1 week
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

apply:
  stage: apply
  script:
    - tofu apply -auto-approve tfplan
  dependencies:
    - plan
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
```

Set cloud credentials (for example `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or an `AWS_ROLE_ARN` for OIDC) as masked CI/CD variables under **Settings > CI/CD > Variables** in your GitLab project. The `apply` job uses `when: manual` so a maintainer must click "Play" in the pipeline UI before infrastructure changes are applied.

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

You have successfully implemented How to Set Up OpenTofu with GitLab CI/CD. This approach provides a repeatable, auditable, and collaborative infrastructure management workflow. Combine with code review processes, automated testing, and proper access controls for a production-ready setup.
