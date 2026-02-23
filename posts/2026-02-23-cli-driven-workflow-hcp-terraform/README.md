# How to Configure CLI-Driven Workflow in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, CLI, Remote Execution, DevOps

Description: Configure the CLI-driven workflow in HCP Terraform to run remote plans and applies from your terminal while keeping state managed centrally.

---

The CLI-driven workflow in HCP Terraform gives you the best of both worlds. You run `terraform plan` and `terraform apply` from your terminal like normal, but the actual execution happens remotely on HCP Terraform's infrastructure. State is stored and locked centrally. Credentials live in the workspace, not on your laptop. And you still get all the governance features like policy checks and cost estimation.

This guide covers setting up and working with the CLI-driven workflow.

## When to Use CLI-Driven Workflow

Choose CLI-driven over VCS-driven when:

- You are developing and testing configurations iteratively
- Your deployment process is triggered by a CI/CD pipeline (not VCS events)
- You want manual control over when plans and applies happen
- You have configurations that are not in a VCS repository
- You are migrating from local Terraform and want a gradual transition

The CLI-driven workflow is also great for modules that multiple workspaces share, where you want to test changes before committing.

## Setting Up Authentication

First, authenticate your CLI with HCP Terraform:

```bash
terraform login

# Opens a browser window to app.terraform.io
# You authorize the CLI and get a token
# The token is stored at ~/.terraform.d/credentials.tfrc.json
```

Alternatively, set the token via environment variable:

```bash
# Set the token directly (useful in CI/CD)
export TF_TOKEN_app_terraform_io="YOUR_API_TOKEN"
```

Or create the credentials file manually:

```json
{
  "credentials": {
    "app.terraform.io": {
      "token": "YOUR_API_TOKEN"
    }
  }
}
```

## Configuring the Cloud Block

Add a `cloud` block to your Terraform configuration:

```hcl
# main.tf

terraform {
  cloud {
    organization = "acme-infrastructure"

    workspaces {
      name = "dev-application"
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

The `cloud` block replaces the `backend` block. You cannot use both.

### Targeting Multiple Workspaces

If you work with multiple workspaces from the same configuration, use tags instead of a specific name:

```hcl
terraform {
  cloud {
    organization = "acme-infrastructure"

    workspaces {
      tags = ["networking", "aws"]
    }
  }
}
```

Then select which workspace to use:

```bash
# List available workspaces matching the tags
terraform workspace list

# Select a workspace
terraform workspace select production-networking

# Create a new workspace (must match the tags)
terraform workspace new staging-networking
```

## Initialize the Configuration

```bash
terraform init

# Output:
# Initializing HCP Terraform...
#
# Initializing provider plugins...
# - Finding hashicorp/aws versions matching "~> 5.0"...
# - Installing hashicorp/aws v5.30.0...
#
# HCP Terraform has been successfully initialized!
```

During initialization, Terraform:
1. Connects to HCP Terraform
2. Creates the workspace if it does not exist
3. Downloads required providers
4. Configures the remote backend

## Running Plans

```bash
terraform plan

# Running plan in HCP Terraform. Output will stream here.
# Preparing the remote plan...
#
# To view this run in a browser, visit:
# https://app.terraform.io/app/acme-infrastructure/workspaces/dev-application/runs/run-abc123
#
# Waiting for the plan to start...
#
# Terraform v1.7.0
# on linux_amd64
#
# Changes to Outputs:
#   + bucket_name = "acme-dev-app-bucket"
#
# Plan: 2 to add, 0 to change, 0 to destroy.
```

The plan runs on HCP Terraform's infrastructure but streams output back to your terminal. You also get a URL to view the plan in the web UI.

## Running Applies

```bash
terraform apply

# Running apply in HCP Terraform. Output will stream here.
# Preparing the remote apply...
#
# To view this run in a browser, visit:
# https://app.terraform.io/app/acme-infrastructure/workspaces/dev-application/runs/run-def456
#
# [plan output shown here]
#
# Do you want to perform these actions in workspace "dev-application"?
#   Terraform will perform the actions described above.
#   Only 'yes' will be accepted to approve.
#
#   Enter a value: yes
#
# Apply complete! Resources: 2 added, 0 changed, 0 destroyed.
```

The confirmation prompt appears in your terminal even though the execution happens remotely.

## Variables and the CLI-Driven Workflow

Variables can come from multiple sources:

### Workspace Variables (Recommended for Credentials)

Set variables in the HCP Terraform workspace UI or via the API. These persist across runs:

```hcl
# Set via the tfe provider
resource "tfe_variable" "aws_region" {
  key          = "aws_region"
  value        = "us-east-1"
  category     = "terraform"    # Terraform variable
  workspace_id = tfe_workspace.dev.id
}

resource "tfe_variable" "aws_key" {
  key          = "AWS_ACCESS_KEY_ID"
  value        = var.aws_access_key
  category     = "env"          # Environment variable
  sensitive    = true
  workspace_id = tfe_workspace.dev.id
}
```

### CLI Flags

Pass variables directly with the `-var` flag:

```bash
terraform plan -var="instance_count=3" -var="instance_type=t3.large"
```

### Variable Files

Use `.tfvars` files:

```bash
terraform apply -var-file="production.tfvars"
```

Note: When using CLI-driven workflow, `.tfvars` files from your local directory are uploaded to HCP Terraform as part of the configuration.

### Auto-Loaded Variables

Files named `terraform.tfvars` or `*.auto.tfvars` are automatically loaded, just like local Terraform. These files get uploaded with your configuration.

## Environment Variables

The CLI-driven workflow supports environment variables set on the workspace. This is where cloud provider credentials go:

```bash
# These environment variables are available during remote execution:
# AWS_ACCESS_KEY_ID (set in workspace)
# AWS_SECRET_ACCESS_KEY (set in workspace, marked sensitive)
# AWS_DEFAULT_REGION (set in workspace)
```

You can also set `TF_VAR_*` environment variables on the workspace to set Terraform variables:

```
Key: TF_VAR_environment
Value: dev
Category: Environment variable
```

## Structured Run Output

When running from the CLI, you get structured output that includes:

1. A link to the run in the web UI
2. The plan summary
3. Policy check results (if policies are configured)
4. Cost estimation (if enabled)
5. The apply results

```bash
terraform apply

# ...
# --------
# Cost Estimation:
#
# Resources: 2 of 2 estimated
#   $72.00/mo +$72.00
#
# --------
# Sentinel Policies:
#
# This run has policy checks enabled. Checking against 2 policies.
#   - restrict-instance-types ✓ passed
#   - require-tags           ✓ passed
#
# --------
# [Apply output]
```

## CI/CD Integration with CLI Workflow

The CLI-driven workflow integrates naturally with CI/CD pipelines:

```yaml
# .github/workflows/terraform.yml

name: Terraform
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      TF_CLOUD_ORGANIZATION: "acme-infrastructure"
      TF_API_TOKEN: ${{ secrets.TF_API_TOKEN }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -no-color
        if: github.event_name == 'pull_request'

      - name: Terraform Apply
        run: terraform apply -auto-approve -no-color
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

## Switching Between Local and Remote Execution

The `cloud` block supports local execution mode where plans and applies run on your machine but state is stored remotely:

```hcl
terraform {
  cloud {
    organization = "acme-infrastructure"

    workspaces {
      name = "dev-application"
    }
  }
}
```

Then in the workspace settings, set execution mode to "Local". Plans run on your machine with your local environment variables, but state is managed by HCP Terraform.

This is useful for debugging or when you need local tools (like `aws` CLI) during provisioning.

## Canceling Runs

If you need to cancel a running plan or apply:

```bash
# Press Ctrl+C in your terminal
# Terraform sends a cancellation request to HCP Terraform
# The run is marked as canceled

# Or cancel from the UI:
# Go to the run page and click "Cancel Run"
```

For force-canceling a stuck run:

```bash
# In the HCP Terraform UI, click "Force Cancel"
# This immediately terminates the run
# Use with caution - it can leave state in an inconsistent state
```

## Wrapping Up

The CLI-driven workflow gives you the control of local Terraform with the governance of HCP Terraform. Your team gets remote execution, centralized state management, policy enforcement, and cost estimation without changing how they work. The `terraform plan` and `terraform apply` commands work exactly as before - they just execute remotely. Start with the CLI-driven workflow when you are migrating from local Terraform, then consider VCS-driven workflows for workspaces that should be fully automated.
