# How to Use HCP Terraform CLI Integration (cloud block)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, CLI, Cloud Block, Infrastructure as Code

Description: Complete guide to using the HCP Terraform CLI integration with the cloud block for remote execution and state management.

---

The cloud block in Terraform is the bridge between your local CLI and HCP Terraform. It lets you run commands locally while remote execution, state storage, and workspace variable management happen in HCP Terraform by default. If you have been using the older `remote` backend, the cloud block is its modern replacement with better ergonomics and more features. This post covers everything you need to know to set it up and use it effectively.

## Why Use the Cloud Block

Before the cloud block existed, connecting Terraform CLI to HCP Terraform meant using the `remote` backend. The cloud block, introduced in Terraform 1.1, provides a cleaner syntax and better integration with HCP Terraform features like workspace tags, run triggers, and structured output.

Key benefits include:

- Remote state management with locking and versioning
- Remote execution (your plans and applies run on HCP Terraform, not your laptop)
- Speculative plans on pull requests
- Team visibility into all infrastructure changes
- Variable management through the HCP Terraform UI or API

## Basic Setup

First, make sure you are authenticated. Run `terraform login` to generate and store your API token:

```bash
# Authenticate with HCP Terraform

terraform login

# This opens a browser window to generate an API token
# The token is stored in ~/.terraform.d/credentials.tfrc.json
```

Then add the cloud block to your Terraform configuration:

```hcl
# main.tf - Basic cloud block configuration
terraform {
  # The cloud block replaces the old "remote" backend
  cloud {
    organization = "my-company"

    workspaces {
      name = "web-app-production"
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
  region = "us-east-1"
}
```

Run `terraform init` to initialize the connection:

```bash
# Initialize the workspace connection
terraform init

# You should see output like:
# Initializing HCP Terraform...
# Initializing provider plugins...
# Terraform has been successfully initialized!
```

## Working with Workspace Tags

Instead of naming a specific workspace, you can use tags to work with multiple workspaces. This is particularly useful for managing environments:

```hcl
terraform {
  cloud {
    organization = "my-company"

    workspaces {
      # Match any workspace with these tags
      tags = ["app:web-server", "region:us-east-1"]
    }
  }
}
```

When you use tags, Terraform prompts you to select a workspace:

```bash
# Initialize and select a workspace
terraform init

# Terraform will list matching workspaces:
# 1. web-server-staging
# 2. web-server-production
# Enter a value: 1

# Switch workspaces later with
terraform workspace select web-server-production
```

## CLI-Driven Workflow vs VCS-Driven Workflow

The cloud block supports the CLI-driven workflow and can also coexist with VCS-driven workflows. Understanding the difference is important.

In **CLI-driven mode**, you trigger runs from your terminal. The plan and apply still execute remotely on HCP Terraform, but you initiate them with `terraform plan` and `terraform apply` from your machine.

```bash
# CLI-driven workflow - you trigger the run
terraform plan
# Plan runs remotely on HCP Terraform
# Output streams back to your terminal

terraform apply
# Apply runs remotely
# You confirm in your terminal
```

In **VCS-driven mode**, runs trigger automatically when you push to your connected repository. HCP Terraform uses the workspace's VCS settings as the source of truth for applies; the cloud block is mainly useful if you also want developers to run CLI-driven speculative plans against the same workspace.

To make CLI-driven runs execute in HCP Terraform rather than locally, set the workspace execution mode to `remote` in the workspace settings:

```bash
# Set execution mode via API
curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "execution-mode": "remote"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-company/workspaces/web-app-production"
```

## Local Execution with Remote State

Sometimes you want to run plans locally but still store state in HCP Terraform. Set the execution mode to "local":

```hcl
# The cloud block stays the same
terraform {
  cloud {
    organization = "my-company"

    workspaces {
      name = "web-app-staging"
    }
  }
}

# With execution mode set to "local" in workspace settings,
# terraform plan and apply run on YOUR machine
# but state is stored remotely in HCP Terraform
```

This is useful for debugging, testing provider configurations, or when you need access to local files or network resources during execution.

## Passing Variables

When using remote execution, common variables and provider credentials are usually set in HCP Terraform. You can also pass run-specific Terraform variables with `-var`, `-var-file`, or local `TF_VAR_` environment variables when starting CLI-driven runs.

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "instance_count" {
  type        = number
  description = "Number of instances to create"
  default     = 2
}
```

For remote execution, set variables in the workspace:

```bash
# Set a Terraform variable in the workspace
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "environment",
        "value": "production",
        "category": "terraform",
        "hcl": false,
        "sensitive": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"
```

## Structured Run Output

The cloud block supports structured run output, which displays remote plan and apply results in a human-readable format in your terminal. If you need machine-readable JSON for automation in a CLI-driven workspace that supports saved plans, create a saved plan and inspect it with `terraform show -json`:

```bash
# Create a remote saved plan
terraform plan -out=tfplan

# Inspect the saved plan as JSON
terraform show -json tfplan

# Remote saved plans require Terraform CLI 1.6 or later
```

## Migration from Remote Backend

If you are migrating from the `remote` backend, the process is straightforward:

```hcl
# Old configuration (remote backend)
# terraform {
#   backend "remote" {
#     organization = "my-company"
#     workspaces {
#       name = "web-app-production"
#     }
#   }
# }

# New configuration (cloud block)
terraform {
  cloud {
    organization = "my-company"

    workspaces {
      name = "web-app-production"
    }
  }
}
```

Run `terraform init` and follow the prompts to complete the migration:

```bash
# Migrate from remote backend to cloud block
terraform init

# Terraform detects the backend change
# If you were already using the remote backend with HCP Terraform,
# Terraform continues using the same HCP Terraform workspaces
```

## Handling the .terraform Directory

The cloud block stores connection metadata in `.terraform/`. Add it to your `.gitignore`:

```gitignore
# .gitignore
.terraform/
*.tfstate
*.tfstate.backup
```

Keep the `.terraform.lock.hcl` file committed so your team uses reproducible provider selections.

## Troubleshooting Common Issues

If `terraform init` fails with an authentication error, check your credentials:

```bash
# Verify your token is stored
cat ~/.terraform.d/credentials.tfrc.json

# Re-authenticate if needed
terraform login
```

If the workspace does not exist, create it first through the UI or let Terraform create it:

```bash
# Create a workspace via API
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "name": "web-app-production",
        "auto-apply": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-company/workspaces"
```

## Summary

The cloud block is the recommended way to connect your Terraform CLI to HCP Terraform. It provides a cleaner syntax than the remote backend, supports workspace tags for multi-environment workflows, and integrates tightly with HCP Terraform features. Start with a simple named workspace configuration, authenticate with `terraform login`, and build from there.
