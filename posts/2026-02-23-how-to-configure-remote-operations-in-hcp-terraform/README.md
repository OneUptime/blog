# How to Configure Remote Operations in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Remote Operations, Remote Execution, DevOps

Description: Learn how to configure and optimize remote operations in HCP Terraform for consistent, auditable Terraform plan and apply workflows.

---

Remote operations are one of the core features that make HCP Terraform worth using. Instead of running `terraform plan` and `terraform apply` on your local machine - where the results depend on your installed tools, network access, and environment variables - remote operations execute everything in a consistent, managed environment. Plans are reproducible, applies are auditable, and you do not need to worry about someone accidentally running a destroy from their laptop.

This guide covers how to set up remote operations, tune them for your workflow, and handle the edge cases that come up in practice.

## How Remote Operations Work

When you run `terraform plan` with remote operations enabled:

1. Your local Terraform CLI packages your configuration files
2. The package is uploaded to HCP Terraform
3. HCP Terraform queues a run on the workspace
4. A worker picks up the run, downloads the configuration, and runs `terraform plan`
5. Plan output is streamed back to your terminal in real time
6. For applies, the same process happens after plan approval

The key difference from local execution is that the actual Terraform binary runs on HCP Terraform's infrastructure, not on your machine.

## Execution Modes

HCP Terraform workspaces support three execution modes:

### Remote (Default)

Plans and applies run on HCP Terraform's infrastructure:

```hcl
resource "tfe_workspace" "example" {
  name           = "production-vpc"
  organization   = "your-org"
  execution_mode = "remote"
}
```

### Local

State is stored in HCP Terraform, but plans and applies run on your local machine:

```hcl
resource "tfe_workspace" "local_example" {
  name           = "development-testing"
  organization   = "your-org"
  execution_mode = "local"
}
```

### Agent

Plans and applies run on your own agents inside your network:

```hcl
resource "tfe_workspace" "agent_example" {
  name           = "private-infrastructure"
  organization   = "your-org"
  execution_mode = "agent"
  agent_pool_id  = tfe_agent_pool.private.id
}
```

## Setting Up Remote Operations

### Step 1: Configure the Cloud Block

```hcl
# main.tf
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      name = "production-vpc"
    }
  }

  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### Step 2: Set Workspace Variables

Since remote operations do not have access to your local environment, you need to set all required variables in the workspace:

```hcl
# Workspace variable configuration
resource "tfe_variable" "aws_region" {
  key          = "aws_region"
  value        = "us-east-1"
  category     = "terraform"
  workspace_id = tfe_workspace.example.id
  description  = "AWS region for resource deployment"
}

# Environment variables for provider authentication
resource "tfe_variable" "aws_access_key" {
  key          = "AWS_ACCESS_KEY_ID"
  value        = var.aws_access_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.example.id
}

resource "tfe_variable" "aws_secret_key" {
  key          = "AWS_SECRET_ACCESS_KEY"
  value        = var.aws_secret_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.example.id
}
```

### Step 3: Initialize and Run

```bash
# Initialize - this configures the remote backend
terraform init

# Run a plan - executes remotely
terraform plan

# The output streams to your terminal:
# Running plan in HCP Terraform. Output will stream here.
# Pressing Ctrl-C will stop streaming the logs, but will not stop the plan
# running remotely.
#
# Preparing the remote plan...
# ...
```

## Configuring Auto-Apply

For workspaces where you want plans to automatically apply without manual approval:

```hcl
resource "tfe_workspace" "auto_apply" {
  name           = "development-infrastructure"
  organization   = "your-org"
  execution_mode = "remote"
  auto_apply     = true  # Plans apply automatically if successful
}
```

This is common for development environments but usually not recommended for production. You can also enable auto-apply only for VCS-triggered runs:

```hcl
resource "tfe_workspace" "selective_auto_apply" {
  name                          = "staging-infrastructure"
  organization                  = "your-org"
  execution_mode                = "remote"
  auto_apply                    = false
  auto_apply_run_trigger        = true  # Auto-apply only for run triggers
}
```

## Working Directory Configuration

If your Terraform configuration is in a subdirectory of your repository:

```hcl
resource "tfe_workspace" "subdirectory" {
  name              = "networking"
  organization      = "your-org"
  execution_mode    = "remote"
  working_directory = "infrastructure/networking"
}
```

## Terraform Version Management

Control which version of Terraform runs your operations:

```hcl
resource "tfe_workspace" "pinned_version" {
  name              = "production-database"
  organization      = "your-org"
  execution_mode    = "remote"
  terraform_version = "1.7.5"  # Pin to a specific version
}
```

You can also allow the workspace to automatically use the latest version:

```hcl
resource "tfe_workspace" "latest_version" {
  name              = "development-playground"
  organization      = "your-org"
  execution_mode    = "remote"
  terraform_version = "latest"
}
```

## Run Triggers

Run triggers let you create dependencies between workspaces. When one workspace applies successfully, it can trigger runs in dependent workspaces:

```hcl
# The VPC workspace
resource "tfe_workspace" "vpc" {
  name           = "production-vpc"
  organization   = "your-org"
  execution_mode = "remote"
}

# The application workspace depends on the VPC
resource "tfe_workspace" "application" {
  name           = "production-application"
  organization   = "your-org"
  execution_mode = "remote"
}

# Create the run trigger
resource "tfe_run_trigger" "app_depends_on_vpc" {
  workspace_id  = tfe_workspace.application.id
  sourceable_id = tfe_workspace.vpc.id
}
```

When the VPC workspace applies successfully, it automatically queues a plan on the application workspace.

## Handling Sensitive Operations

### Targeted Plans

You can run targeted plans remotely:

```bash
# Target a specific resource
terraform plan -target=aws_instance.web

# Target a module
terraform plan -target=module.database
```

### Destroy Plans

```bash
# Create a destroy plan
terraform plan -destroy

# Or trigger via the CLI
terraform destroy
```

### Replace Resources

```bash
# Force replacement of a specific resource
terraform plan -replace=aws_instance.web
```

## Notification Configurations

Set up notifications for run events:

```hcl
# Slack notification for run events
resource "tfe_notification_configuration" "slack" {
  name             = "Slack Notifications"
  enabled          = true
  destination_type = "slack"
  triggers         = ["run:created", "run:planning", "run:needs_attention", "run:applying", "run:completed", "run:errored"]
  url              = var.slack_webhook_url
  workspace_id     = tfe_workspace.example.id
}

# Generic webhook notification
resource "tfe_notification_configuration" "webhook" {
  name             = "Custom Webhook"
  enabled          = true
  destination_type = "generic"
  triggers         = ["run:completed", "run:errored"]
  url              = "https://api.example.com/terraform-notifications"
  token            = var.webhook_token
  workspace_id     = tfe_workspace.example.id
}
```

## Optimizing Remote Operations

### Provider Caching

Remote operations download providers fresh for each run. This is usually fast, but for workspaces with many providers, it can add time. There is not much you can do about this on the HCP Terraform side, but you can minimize it by keeping your provider list lean.

### Parallelism

Adjust the parallelism setting for large configurations:

```bash
# Remote runs respect the parallelism setting
terraform apply -parallelism=20
```

### State Size

Large state files slow down every operation. Keep your state manageable:

```hcl
# Split large configurations into smaller workspaces
# Instead of one monolith workspace, use:
# - networking workspace
# - compute workspace
# - database workspace
# - monitoring workspace
```

## Debugging Remote Operations

When a remote operation fails and you need more information:

```bash
# Enable detailed logging via environment variable
# Set TF_LOG as a workspace environment variable
resource "tfe_variable" "debug_logging" {
  key          = "TF_LOG"
  value        = "DEBUG"
  category     = "env"
  workspace_id = tfe_workspace.example.id
}
```

View run details via the API:

```bash
# Get run details including plan and apply logs
RUN_ID="run-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/runs/${RUN_ID}" \
  | jq '.data.attributes | {status, message, "has-changes", "resource-additions", "resource-changes", "resource-destructions"}'
```

## Limitations of Remote Operations

There are a few things to be aware of:

- **No interactive input**: You cannot respond to prompts during remote operations. Use `-auto-approve` or configure auto-apply.
- **No local provisioners by default**: `local-exec` provisioners run on the HCP Terraform worker, not your machine. Use agents if you need local network access.
- **File uploads have size limits**: The configuration upload has a size limit. Use `.terraformignore` to exclude unnecessary files.
- **Execution timeouts**: Plans and applies have time limits. Very large configurations may hit them.

Create a `.terraformignore` file to keep uploads lean:

```text
# .terraformignore
.git/
.terraform/
*.tfstate
*.tfstate.*
.DS_Store
node_modules/
docs/
tests/
```

## Summary

Remote operations in HCP Terraform give you consistent execution, automatic state locking, and a complete audit trail of every infrastructure change. Configure your workspace execution mode, set your variables and credentials, and your local `terraform plan` and `terraform apply` commands will seamlessly run on HCP Terraform's infrastructure. For most teams, remote execution is the right default - switch to local execution only when you have a specific reason.

For related reading, see our guides on [speculative plans](https://oneuptime.com/blog/post/2026-02-23-how-to-use-speculative-plans-in-hcp-terraform/view) and [configuring workspace execution mode](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-workspace-execution-mode-in-hcp-terraform/view).
