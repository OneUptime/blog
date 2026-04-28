# How to Set Up OpenTofu with Azure DevOps Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure DevOps, CI/CD, Infrastructure as Code, IaC, DevOps

Description: Learn how to configure Azure DevOps pipelines to run OpenTofu plan and apply with environment approvals.

## Introduction

Learn how to configure Azure DevOps pipelines to run OpenTofu plan and apply with environment approvals. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow.

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

Create an Azure DevOps environment named `production` (Pipelines > Environments > Create environment) and add the required approvers under **Approvals and checks**. The `Apply` stage below targets that environment, so Azure DevOps will pause and wait for an approver before running `tofu apply`.

Store your cloud credentials as secret pipeline variables (for example `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`) or use a service connection.

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pr:
  branches:
    include:
      - main

variables:
  TOFU_VERSION: "1.7.0"
  AWS_DEFAULT_REGION: us-east-1

stages:
  - stage: Plan
    displayName: OpenTofu Plan
    jobs:
      - job: Plan
        pool:
          vmImage: ubuntu-latest
        steps:
          - checkout: self

          - script: |
              curl -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
              chmod +x install-opentofu.sh
              ./install-opentofu.sh --install-method standalone --opentofu-version $(TOFU_VERSION) --skip-verify
              rm install-opentofu.sh
            displayName: Install OpenTofu

          - script: tofu init
            displayName: OpenTofu Init
            env:
              AWS_ACCESS_KEY_ID: $(AWS_ACCESS_KEY_ID)
              AWS_SECRET_ACCESS_KEY: $(AWS_SECRET_ACCESS_KEY)

          - script: tofu plan -no-color -out=tfplan
            displayName: OpenTofu Plan
            env:
              AWS_ACCESS_KEY_ID: $(AWS_ACCESS_KEY_ID)
              AWS_SECRET_ACCESS_KEY: $(AWS_SECRET_ACCESS_KEY)

          - publish: tfplan
            artifact: tfplan
            displayName: Publish Plan Artifact

  - stage: Apply
    displayName: OpenTofu Apply
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Apply
        pool:
          vmImage: ubuntu-latest
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self

                - script: |
                    curl -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
                    chmod +x install-opentofu.sh
                    ./install-opentofu.sh --install-method standalone --opentofu-version $(TOFU_VERSION) --skip-verify
                    rm install-opentofu.sh
                  displayName: Install OpenTofu

                - download: current
                  artifact: tfplan
                  displayName: Download Plan Artifact

                - script: tofu init
                  displayName: OpenTofu Init
                  env:
                    AWS_ACCESS_KEY_ID: $(AWS_ACCESS_KEY_ID)
                    AWS_SECRET_ACCESS_KEY: $(AWS_SECRET_ACCESS_KEY)

                - script: tofu apply -auto-approve $(Pipeline.Workspace)/tfplan/tfplan
                  displayName: OpenTofu Apply
                  env:
                    AWS_ACCESS_KEY_ID: $(AWS_ACCESS_KEY_ID)
                    AWS_SECRET_ACCESS_KEY: $(AWS_SECRET_ACCESS_KEY)
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
3. Review state consistency: Run `tofu refresh` then `tofu plan`
4. Consult provider documentation for service-specific errors

## Conclusion

You have successfully implemented How to Set Up OpenTofu with Azure DevOps Pipelines. This approach provides a repeatable, auditable, and collaborative infrastructure management workflow. Combine with code review processes, automated testing, and proper access controls for a production-ready setup.
