# How to Migrate from Local Terraform to HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Migration, Remote State, Infrastructure as Code

Description: A practical guide to migrating your Terraform workflows from local execution and state to HCP Terraform with minimal disruption.

---

If you have been running Terraform locally - state files on your machine or in an S3 bucket, plans and applies from your laptop - there comes a point where that stops working. Maybe your team is growing, maybe you had a scare with state file corruption, or maybe you just want proper collaboration features. Whatever the reason, migrating to HCP Terraform is a well-trodden path.

This guide covers the migration process from start to finish, including handling existing state, updating your backend configuration, and dealing with the gotchas that come up along the way.

## What You Are Moving

A typical migration from local Terraform to HCP Terraform involves:

1. **State files**: Moving your `.tfstate` from local storage (or S3/GCS/Azure Blob) to HCP Terraform
2. **Backend configuration**: Switching from `local`, `s3`, `gcs`, or `azurerm` backend to the `cloud` block
3. **Variable definitions**: Moving from `terraform.tfvars` and environment variables to workspace variables
4. **Execution**: Moving from running `terraform plan` and `terraform apply` on your machine to remote execution

## Step 1: Set Up Your HCP Terraform Account

If you do not already have an account:

1. Sign up at [app.terraform.io](https://app.terraform.io)
2. Create an organization
3. Generate a user API token if you plan to use the API examples later: **User Settings** > **Tokens** > **Create an API token**

Then authenticate your local CLI:

```bash
# Authenticate the Terraform CLI with HCP Terraform

terraform login

# This opens a browser window for authentication
# After authorizing, the token is saved to ~/.terraform.d/credentials.tfrc.json
```

## Step 2: Create a Workspace

Create a workspace in HCP Terraform for each root module (each directory where you run `terraform apply`):

### Through the UI

1. Go to your organization
2. Click **New** > **Workspace**
3. Choose **CLI-driven workflow** (best for migration since it matches your current workflow)
4. Name the workspace to match your project

### Using Terraform

```hcl
# workspace-setup/main.tf - Bootstrap workspace creation
provider "tfe" {}

resource "tfe_workspace" "app_infrastructure" {
  name         = "app-infrastructure-production"
  organization = "your-org"

  # Use CLI-driven for initial migration
  # You can switch to VCS-driven later
  terraform_version = "1.7.0"

  tag_names = ["production", "app", "migrated"]
}

resource "tfe_workspace_settings" "app_infrastructure" {
  workspace_id   = tfe_workspace.app_infrastructure.id
  execution_mode = "remote"
}
```

## Step 3: Update Your Backend Configuration

This is the core of the migration. Replace your current backend block with the `cloud` block.

### Before (Local Backend)

```hcl
# Old configuration - local state
terraform {
  # No backend block, or:
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### Before (S3 Backend)

```hcl
# Old configuration - S3 backend
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "production/app/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### After (HCP Terraform)

```hcl
# New configuration - HCP Terraform
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      name = "app-infrastructure-production"
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

## Step 4: Migrate the State

With the backend configuration updated, run `terraform init` to trigger the migration:

```bash
# Initialize with the new backend - Terraform detects the change
terraform init

# Terraform will prompt:
# Do you want to copy existing state to the new backend?
# Enter "yes"
```

Terraform will:
1. Read your existing state from the old backend
2. Upload it to the HCP Terraform workspace
3. Configure the workspace as the active backend

If the automatic migration does not work (for example, if you are changing the state structure), you can manually push state:

```bash
# Manual state push - use if automatic migration fails
# First, make sure you have a local copy of your state
terraform state pull > backup.tfstate

# Update the backend configuration to cloud block
# Then initialize
terraform init

# If init does not offer to migrate, push manually
terraform state push backup.tfstate
```

## Step 5: Move Variables

Variables that you want managed centrally, especially secrets and values you were passing with `-var` flags, should be set in the workspace. HCP Terraform can load `terraform.tfvars` and `*.auto.tfvars` files that are included in the uploaded configuration, but it does not persist those values as workspace variables or display them in the workspace UI.

### Terraform Variables

```bash
# Set variables via the API
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

# Non-sensitive variable
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "environment",
        "value": "production",
        "category": "terraform",
        "sensitive": false,
        "description": "Deployment environment"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars"
```

### Environment Variables

Cloud provider credentials that were in your shell environment need to be set as workspace environment variables:

```bash
# Set AWS credentials as environment variables
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "AWS_ACCESS_KEY_ID",
        "value": "AKIA...",
        "category": "env",
        "sensitive": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars"
```

Or use the TFE provider:

```hcl
# Set workspace variables with Terraform
resource "tfe_variable" "environment" {
  key          = "environment"
  value        = "production"
  category     = "terraform"
  workspace_id = tfe_workspace.app_infrastructure.id
}

resource "tfe_variable" "aws_region" {
  key          = "AWS_DEFAULT_REGION"
  value        = "us-east-1"
  category     = "env"
  workspace_id = tfe_workspace.app_infrastructure.id
}

resource "tfe_variable" "aws_access_key" {
  key          = "AWS_ACCESS_KEY_ID"
  value        = var.aws_access_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.app_infrastructure.id
}
```

## Step 6: Verify the Migration

Run a plan to make sure everything is working:

```bash
# Run a plan - this now executes remotely in HCP Terraform
terraform plan
```

You should see:

```text
Running plan in HCP Terraform. Output will stream here. Pressing Ctrl-C
will stop streaming the logs, but will not stop the plan running remotely.

Preparing the remote plan...

...

No changes. Your infrastructure matches the configuration.
```

The "No changes" output confirms that your state was migrated correctly and HCP Terraform can reach your infrastructure.

## Handling Multiple Workspaces

If you use Terraform workspaces locally (e.g., `terraform workspace select staging`), you need to handle them differently in HCP Terraform.

### Option 1: Separate HCP Terraform Workspaces

Create a separate HCP Terraform workspace for each local workspace:

```hcl
# Use workspace tags to match multiple workspaces
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      tags = ["app-infrastructure"]
    }
  }
}
```

Then create HCP Terraform workspaces with those tags:

```hcl
resource "tfe_workspace" "staging" {
  name         = "app-infrastructure-staging"
  organization = "your-org"
  tag_names    = ["app-infrastructure", "staging"]
}

resource "tfe_workspace" "production" {
  name         = "app-infrastructure-production"
  organization = "your-org"
  tag_names    = ["app-infrastructure", "production"]
}
```

### Option 2: Replace Remote Backend Prefixes with Tags

If you were using the older `remote` backend with a `prefix` argument, replace that prefix selection with workspace tags. The `cloud` block does not support `prefix`, so after migration you need to select HCP Terraform workspaces by their full names in the Terraform CLI.

```hcl
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      # Matches workspaces with this tag
      tags = ["app-infrastructure"]
    }
  }
}
```

## Step 7: Clean Up

After verifying the migration:

```bash
# Remove the old local state file (back it up first)
cp terraform.tfstate terraform.tfstate.backup.pre-migration
rm terraform.tfstate
rm terraform.tfstate.backup

# If migrating from S3, you can optionally remove the old state object
# (keep it around for a while as a safety net)
# aws s3 rm s3://my-terraform-state/production/app/terraform.tfstate
```

## Common Migration Issues

### "Backend configuration changed" Errors

If Terraform refuses to migrate state:

```bash
# Force re-initialization
terraform init -reconfigure

# Then manually push state
terraform state push backup.tfstate
```

### State Locking Conflicts

If the old backend still holds a lock:

```bash
# Force unlock on the old backend (use with caution)
terraform force-unlock LOCK_ID
```

### Provider Authentication in Remote Execution

When execution moves to HCP Terraform, your local environment variables are not available. Make sure all required credentials are set as workspace environment variables or use dynamic credentials.

### terraform.tfvars Not Persisted as Workspace Variables

HCP Terraform can read `terraform.tfvars` and `*.auto.tfvars` files during remote execution when those files are included in the uploaded configuration, but it does not save them as workspace variables. For shared values and secrets, set variables in the workspace settings or use variable sets.

## Migration Checklist

Before declaring the migration complete:

- [ ] State successfully uploaded to HCP Terraform workspace
- [ ] `terraform plan` shows no changes (state parity confirmed)
- [ ] All Terraform variables set in workspace
- [ ] All environment variables (credentials) set in workspace
- [ ] Team members have access to the workspace
- [ ] Old state backend backed up
- [ ] CI/CD pipeline updated (if applicable)
- [ ] VCS connection configured (if switching to VCS-driven workflow)

## Summary

Migrating from local Terraform to HCP Terraform is mostly about updating the backend configuration and moving your state. The `terraform init` command handles the heavy lifting of state migration. The parts that take the most time are usually setting up variables and making sure remote execution has the right credentials. Take it one workspace at a time, verify with a plan after each migration, and keep backups of your old state until you are confident the migration is complete.

For next steps after migration, see our guides on [configuring remote operations](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-remote-operations-in-hcp-terraform/view) and [using Terraform Cloud as a remote backend](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-cloud-as-remote-backend/view).
