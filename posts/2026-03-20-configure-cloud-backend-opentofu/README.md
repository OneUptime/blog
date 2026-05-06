# How to Configure the Cloud Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloud Backend, Terraform Cloud, Remote State, Configuration

Description: Learn how to configure the cloud backend in OpenTofu to use Terraform Cloud or HCP Terraform for remote state storage, plan execution, and workspace management.

## Introduction

The cloud backend in OpenTofu can connect your configurations to HCP Terraform (formerly Terraform Cloud) or Terraform Enterprise for remote state storage and, when supported by the backend, remote plan/apply execution, a collaborative UI, and policy enforcement. It replaces the older `remote` backend with a more feature-rich CLI integration.

## Basic Cloud Backend Configuration

```hcl
# main.tf

terraform {
  cloud {
    hostname     = "app.terraform.io"
    organization = "my-company"

    workspaces {
      name = "production-infrastructure"
    }
  }

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
```

## Authentication

```bash
# Option 1: Interactive login

tofu login app.terraform.io

# This opens a browser, authenticates to HCP Terraform,
# and saves the API token in a local CLI credentials file.

# Option 2: Environment variable
export TF_TOKEN_app_terraform_io="your-api-token"

# Option 3: Direct CLI config
cat > ~/.tofurc << 'EOF'
credentials "app.terraform.io" {
  token = "your-api-token-here"
}
EOF
```

## Workspace Tag-Based Selection

```hcl
# Instead of a single workspace, select by tags
terraform {
  cloud {
    hostname     = "app.terraform.io"
    organization = "my-company"

    workspaces {
      tags = ["aws", "production"]
    }
  }
}
```

```bash
# Initialize the working directory
tofu init

# Select a matching workspace with TF_WORKSPACE
export TF_WORKSPACE="production-us-east-1"

# Or switch between matching workspaces with workspace commands
tofu workspace select production-us-east-1
```

## Hostname for HCP Terraform or TFE

```hcl
# For Terraform Enterprise (self-hosted)
terraform {
  cloud {
    hostname     = "tfe.internal.company.com"
    organization = "my-company"

    workspaces {
      name = "production"
    }
  }
}

# Or login interactively for the custom hostname
# tofu login tfe.internal.company.com

# credentials block for custom hostname
# ~/.tofurc
# credentials "tfe.internal.company.com" {
#   token = "your-tfe-token"
# }
```

## Variable Configuration

```hcl
# Variables can be set in the workspace UI or via API
# Environment variables and Terraform variables

variable "environment" {
  type    = string
  default = "production"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}
```

```bash
# Set workspace variables via the HCP Terraform API
curl -X POST \
  -H "Authorization: Bearer $TF_TOKEN_app_terraform_io" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars" \
  -d '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "AWS_ACCESS_KEY_ID",
        "value": "'$AWS_ACCESS_KEY_ID'",
        "category": "env",
        "sensitive": true
      }
    }
  }'
```

## Initializing with Cloud Backend

```bash
# Initialize the cloud backend
tofu init

# Typical output includes:
# Initializing HCP Terraform...
# HCP Terraform has been successfully initialized!
#
# You may now begin working with HCP Terraform.

# Show current workspace
tofu workspace show
```

## Workspace Creation

```bash
# Create a new workspace via the HCP Terraform API
curl -X POST \
  -H "Authorization: Bearer $TF_TOKEN_app_terraform_io" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-company/workspaces" \
  -d '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "name": "production-infrastructure",
        "auto-apply": false,
        "working-directory": ""
      }
    }
  }'
```

## .terraformignore for Cloud Backend

```text
# .terraformignore - exclude files from cloud backend uploads
.git/
.terraform/
*.tfstate
*.tfstate.backup
.DS_Store
*.log
tests/
.terragrunt-cache/
```

## Migrating from Local to Cloud Backend

```bash
# Step 1: Add cloud backend configuration to main.tf
# (as shown above)

# Step 2: Run init with migration
tofu init

# OpenTofu detects existing local state and prompts you to migrate it.
# If you are migrating multiple CLI workspaces, it may also prompt you
# to rename them for the cloud backend.

# Step 3: Verify state was migrated
tofu state list  # Should show same resources
```

## Conclusion

For OpenTofu, the cloud backend configuration for HCP Terraform or Terraform Enterprise requires four key elements: the `hostname`, `organization` name, `workspaces` configuration (either a single name or a tag set), and authentication via token. The `tofu login` command handles interactive authentication and token storage, and for CI/CD you can set the `TF_TOKEN_app_terraform_io` environment variable. After initialization, `tofu plan` and `tofu apply` typically execute remotely with logs streamed to the local terminal, unless the workspace is configured for local execution or the backend only supports state storage.
