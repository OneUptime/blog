# How to Use Terraform Cloud as Remote Backend

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Remote Backend, State Management, Infrastructure as Code

Description: Learn how to configure and use Terraform Cloud (HCP Terraform) as a remote backend for state storage, locking, and remote execution.

---

Using Terraform Cloud as your remote backend is one of the first things most teams do when they move beyond running Terraform on a single developer's laptop. It gives you centralized state storage, automatic state locking, state versioning, and the option to run plans and applies remotely. No more passing state files around or worrying about concurrent modifications.

This guide covers how to set up Terraform Cloud as your remote backend, the different configuration options, and how to get the most out of it.

## What the Remote Backend Gives You

When you switch to Terraform Cloud as your backend, you get:

- **Centralized state storage**: State lives in Terraform Cloud, not on someone's laptop or in an S3 bucket you manage yourself
- **Automatic locking**: No more state corruption from concurrent runs
- **State versioning**: Every state change is versioned, so you can roll back if needed
- **Encryption at rest**: State is encrypted by default
- **Access control**: State access is tied to workspace permissions
- **Remote execution** (optional): Run plans and applies on Terraform Cloud's infrastructure

## Configuration Options

There are two ways to configure Terraform Cloud as your backend: the `cloud` block (recommended) and the legacy `remote` backend. Let us cover both.

### The Cloud Block (Recommended)

The `cloud` block was introduced in Terraform 1.1 and is the preferred way to integrate with Terraform Cloud:

```hcl
# main.tf - Using the cloud block
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      name = "my-application-production"
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

provider "aws" {
  region = var.aws_region
}
```

### Matching Multiple Workspaces with Tags

If you want one configuration to work with multiple workspaces (e.g., staging and production), use tags:

```hcl
terraform {
  cloud {
    organization = "your-org"

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
terraform workspace select networking-production
```

### The Legacy Remote Backend

If you are on an older version of Terraform or need backward compatibility:

```hcl
# main.tf - Using the legacy remote backend
terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "your-org"

    workspaces {
      name = "my-application-production"
    }
  }
}
```

Or with a prefix for multiple workspaces:

```hcl
terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "your-org"

    workspaces {
      prefix = "my-application-"
    }
  }
}
```

## Authentication

Before you can use Terraform Cloud as a backend, you need to authenticate:

### Method 1: terraform login

```bash
# Interactive login - opens a browser for OAuth
terraform login

# For Terraform Enterprise (self-hosted)
terraform login terraform.your-company.com
```

### Method 2: Credentials File

Create the credentials file directly:

```bash
# Create the credentials directory
mkdir -p ~/.terraform.d

# Write the credentials file
cat > ~/.terraform.d/credentials.tfrc.json << 'EOF'
{
  "credentials": {
    "app.terraform.io": {
      "token": "your-api-token-here"
    }
  }
}
EOF

# Secure the file
chmod 600 ~/.terraform.d/credentials.tfrc.json
```

### Method 3: Environment Variable

```bash
# Set the token via environment variable
# Format: TF_TOKEN_<hostname_with_underscores>
export TF_TOKEN_app_terraform_io="your-api-token-here"
```

## Initializing the Backend

Once configured, initialize:

```bash
# Initialize the Terraform Cloud backend
terraform init

# Output:
# Initializing Terraform Cloud...
#
# Initializing provider plugins...
# - Finding hashicorp/aws versions matching "~> 5.0"...
# - Installing hashicorp/aws v5.30.0...
#
# Terraform Cloud has been successfully initialized!
```

If you are migrating from another backend, Terraform will ask if you want to copy your existing state:

```bash
terraform init

# Do you want to copy existing state to the new backend?
#   Enter a value: yes
```

## Remote Execution vs. Local Execution

By default, when you use Terraform Cloud as a backend, it also runs your plans and applies remotely. But you can change this behavior.

### Remote Execution (Default)

Plans and applies run on Terraform Cloud's infrastructure:

```bash
# This runs remotely - you see streamed output
terraform plan

# Running plan in HCP Terraform. Output will stream here...
# Terraform v1.7.0
# ...
```

Benefits:
- Consistent execution environment
- No need for local credentials (set them in the workspace)
- Audit trail for all runs

### Local Execution

If you want state storage in Terraform Cloud but want to run plans locally:

Set the workspace to **local** execution mode in the UI or via API:

```bash
# Set execution mode to local via API
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "execution-mode": "local"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}"
```

Or using Terraform:

```hcl
resource "tfe_workspace" "example" {
  name           = "my-application-production"
  organization   = "your-org"
  execution_mode = "local"
}
```

In local execution mode:
- State is stored in Terraform Cloud (with locking and versioning)
- Plans and applies run on your local machine
- You need local credentials for your providers

## Working with State

### Viewing State

```bash
# Pull the current state
terraform state list

# Show details for a specific resource
terraform state show aws_instance.web

# Pull the full state (useful for debugging)
terraform state pull > current-state.json
```

### State Versioning

Every `terraform apply` creates a new state version. You can view and restore previous versions:

```bash
# List state versions via API
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/state-versions" \
  | jq '.data[] | {id: .id, serial: .attributes.serial, created: .attributes["created-at"]}'
```

### Rolling Back State

If you need to roll back to a previous state version:

```bash
# Download a previous state version
STATE_VERSION_ID="sv-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/state-versions/${STATE_VERSION_ID}" \
  | jq -r '.data.attributes["hosted-state-download-url"]' \
  | xargs curl -o previous-state.json

# Push the previous state as the current version
terraform state push previous-state.json
```

## Variable Sets for Shared Configuration

When multiple workspaces share common variables (like cloud credentials), use variable sets:

```hcl
# Create a variable set shared across workspaces
resource "tfe_variable_set" "aws_credentials" {
  name         = "AWS Production Credentials"
  description  = "Shared AWS credentials for production workspaces"
  organization = "your-org"
}

# Add variables to the set
resource "tfe_variable" "aws_access_key" {
  key             = "AWS_ACCESS_KEY_ID"
  value           = var.aws_access_key_id
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.aws_credentials.id
}

resource "tfe_variable" "aws_secret_key" {
  key             = "AWS_SECRET_ACCESS_KEY"
  value           = var.aws_secret_access_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.aws_credentials.id
}

# Apply the variable set to specific workspaces
resource "tfe_workspace_variable_set" "production_creds" {
  variable_set_id = tfe_variable_set.aws_credentials.id
  workspace_id    = tfe_workspace.production.id
}
```

## Best Practices

### Use the Cloud Block Over the Remote Backend

The `cloud` block is newer and will receive future improvements. The `remote` backend is maintained but not getting new features.

### Pin Your Terraform Version

```hcl
terraform {
  cloud {
    organization = "your-org"
    workspaces {
      name = "production"
    }
  }

  # Pin to a specific version to avoid surprises
  required_version = "~> 1.7.0"
}
```

### Use Separate Workspaces for Environments

Do not try to manage staging and production in the same workspace. Keep them separate:

```
my-app-development   -> dev AWS account
my-app-staging       -> staging AWS account
my-app-production    -> production AWS account
```

### Back Up State Before Major Changes

```bash
# Always pull a backup before risky operations
terraform state pull > state-backup-$(date +%Y%m%d-%H%M%S).json
```

## Troubleshooting

**"Error: No valid credential sources found"**: Your Terraform Cloud credentials are missing or expired. Run `terraform login` again.

**"Error: Failed to read state"**: Check workspace permissions. Your token may not have access to the workspace.

**"Error: The currently running version of Terraform doesn't meet the version requirements"**: The workspace has a Terraform version constraint that does not match your local CLI. Update your local Terraform or change the workspace setting.

**Plans show unexpected changes after migration**: This usually means the state was not migrated correctly. Pull the state from both the old and new backends and compare them.

## Summary

Using Terraform Cloud as a remote backend is the simplest upgrade you can make to your Terraform workflow. It eliminates state management headaches, provides built-in locking, and opens the door to remote execution and collaboration features. Start with the `cloud` block, authenticate with `terraform login`, and run `terraform init` to get started.

For more on this topic, see our guides on [migrating from local Terraform to HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-local-terraform-to-hcp-terraform/view) and [handling Terraform state in HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-state-in-hcp-terraform/view).
