# How to Use Environment Variables in HCP Terraform Workspaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Environment Variables, Workspaces, Secrets Management

Description: Learn how to configure and manage environment variables in HCP Terraform workspaces for provider auth and runtime configuration.

---

Environment variables in HCP Terraform workspaces control provider authentication, Terraform behavior, and runtime configuration for external tools. Unlike Terraform variables that feed into your HCL code, environment variables live in the shell where Terraform executes. This guide covers how to set them up, common patterns, and best practices for managing sensitive values.

## What Environment Variables Do in HCP Terraform

When HCP Terraform runs a plan or apply, it sets up an execution environment - essentially a Linux shell. Any environment variables you configure in the workspace are exported into that shell before Terraform runs. Providers, provisioners, and external data sources can then read these values.

The most common use case is provider authentication. The AWS provider, for example, reads `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from the environment. You never put these in your HCL code.

## Setting Environment Variables via the UI

The simplest way to add environment variables is through the HCP Terraform web interface:

1. Navigate to your workspace
2. Click **Variables** in the left sidebar
3. Click **Add variable** under the **Environment Variables** section
4. Enter the key, value, and optionally mark it as sensitive
5. Click **Save variable**

This is fine for one-off setups, but for repeatable workflows, use the API.

## Setting Environment Variables via the API

```bash
# Set AWS credentials as environment variables
# First, get your workspace ID
WORKSPACE_ID=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces/my-workspace" | \
  jq -r '.data.id')

# Set AWS_ACCESS_KEY_ID
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"vars\",
      \"attributes\": {
        \"key\": \"AWS_ACCESS_KEY_ID\",
        \"value\": \"AKIA...\",
        \"category\": \"env\",
        \"sensitive\": true
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars"

# Set AWS_SECRET_ACCESS_KEY
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"vars\",
      \"attributes\": {
        \"key\": \"AWS_SECRET_ACCESS_KEY\",
        \"value\": \"wJalr...\",
        \"category\": \"env\",
        \"sensitive\": true
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars"
```

The `"category": "env"` field is what distinguishes environment variables from Terraform variables.

## Provider Authentication Patterns

### AWS Authentication

```bash
# Option 1: Static credentials (simple but less secure)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1

# Option 2: Assume role (more secure)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
# Then configure the provider to assume a role
```

```hcl
# main.tf - Provider uses environment variables automatically
provider "aws" {
  region = "us-east-1"

  # Optionally assume a different role
  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/TerraformRole"
  }
}
```

### Azure Authentication

```bash
# Service principal authentication
ARM_CLIENT_ID=your-client-id
ARM_CLIENT_SECRET=your-client-secret  # Mark as sensitive
ARM_SUBSCRIPTION_ID=your-subscription-id
ARM_TENANT_ID=your-tenant-id
```

```hcl
# The Azure provider reads these environment variables automatically
provider "azurerm" {
  features {}
}
```

### Google Cloud Authentication

```bash
# Service account key (JSON)
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"my-project",...}
GOOGLE_PROJECT=my-project
GOOGLE_REGION=us-central1
```

The `GOOGLE_CREDENTIALS` value contains the entire JSON key file content. Mark it as sensitive.

### Multiple Provider Configurations

When working with multiple cloud providers in one workspace:

```bash
# AWS credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Azure credentials
ARM_CLIENT_ID=...
ARM_CLIENT_SECRET=...
ARM_SUBSCRIPTION_ID=...
ARM_TENANT_ID=...

# Each provider reads its own set of environment variables
```

## Terraform Behavior Variables

Beyond provider auth, environment variables control Terraform itself:

```bash
# Enable debug logging
TF_LOG=DEBUG

# Set specific log level for the provider
TF_LOG_PROVIDER=TRACE

# Limit parallelism (useful for rate-limited APIs)
TF_CLI_ARGS_plan=-parallelism=5
TF_CLI_ARGS_apply=-parallelism=5

# Set input to false (prevents interactive prompts in remote execution)
TF_INPUT=0
```

```bash
# Set TF_LOG via the API to debug a failing workspace
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "TF_LOG",
        "value": "DEBUG",
        "category": "env",
        "sensitive": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars"
```

Remember to remove `TF_LOG` after debugging - it generates a lot of output and slows down runs.

## Variable Sets for Shared Environment Variables

When multiple workspaces need the same environment variables (like AWS credentials for the same account), use variable sets:

```bash
# Create a variable set with shared AWS credentials
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "varsets",
      "attributes": {
        "name": "AWS Production Account",
        "description": "AWS credentials for production account 123456789012",
        "global": false
      },
      "relationships": {
        "workspaces": {
          "data": [
            {"type": "workspaces", "id": "ws-abc123"},
            {"type": "workspaces", "id": "ws-def456"},
            {"type": "workspaces", "id": "ws-ghi789"}
          ]
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/varsets"
```

Then add variables to the variable set:

```bash
# Get the variable set ID from the response above
VARSET_ID="varset-abc123"

# Add AWS_ACCESS_KEY_ID to the variable set
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
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
  "https://app.terraform.io/api/v2/varsets/$VARSET_ID/relationships/vars"
```

Now all three workspaces share the same AWS credentials. Update them in one place when you rotate keys.

## Dynamic Credentials (Recommended)

Instead of static API keys, HCP Terraform supports dynamic credentials through workload identity federation. This is the most secure approach:

```hcl
# main.tf - Using dynamic credentials with AWS
provider "aws" {
  region = "us-east-1"
  # No static credentials needed
  # HCP Terraform generates short-lived tokens automatically
}
```

For dynamic credentials, set these environment variables in the workspace:

```bash
# Enable dynamic credentials for AWS
TFC_AWS_PROVIDER_AUTH=true
TFC_AWS_RUN_ROLE_ARN=arn:aws:iam::123456789012:role/tfc-role

# For Azure
TFC_AZURE_PROVIDER_AUTH=true
TFC_AZURE_RUN_CLIENT_ID=your-client-id

# For GCP
TFC_GCP_PROVIDER_AUTH=true
TFC_GCP_RUN_SERVICE_ACCOUNT_EMAIL=terraform@project.iam.gserviceaccount.com
```

Dynamic credentials eliminate long-lived secrets in your workspace variables. Each run gets a fresh, short-lived token.

## Updating Environment Variables

To update an existing environment variable, you need its variable ID:

```bash
# List all variables in a workspace
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars" | \
  jq '.data[] | select(.attributes.category == "env") | {id: .id, key: .attributes.key}'

# Update a specific variable
curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "value": "new-value-here"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars/var-VARIABLE_ID"
```

## Sensitive vs Non-Sensitive

Mark any credential, key, or secret as sensitive. Sensitive variables:

- Cannot be read back through the UI or API after creation
- Are masked in run logs
- Require re-entering the full value to update

Non-sensitive environment variables (like `AWS_DEFAULT_REGION` or `TF_LOG`) can be freely read and updated.

```bash
# Example: region is not sensitive, credentials are
# AWS_DEFAULT_REGION=us-east-1      (sensitive: false)
# AWS_ACCESS_KEY_ID=AKIA...          (sensitive: true)
# AWS_SECRET_ACCESS_KEY=...          (sensitive: true)
```

## Troubleshooting

If a provider cannot authenticate, check these common issues:

```bash
# 1. Verify the variable exists and is in the right category
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars" | \
  jq '.data[] | {key: .attributes.key, category: .attributes.category}'

# 2. Check for typos in variable names
# AWS_ACESS_KEY_ID (wrong - missing C)
# AWS_ACCESS_KEY_ID (correct)

# 3. Enable debug logging temporarily
# Add TF_LOG=DEBUG as an environment variable
# Check the run output for auth-related messages
```

## Summary

Environment variables in HCP Terraform handle provider authentication and runtime configuration. Use them for cloud credentials, Terraform behavior flags, and any value that external tools need from the shell environment. For the most secure setup, move to dynamic credentials. For shared values, use variable sets. And always mark secrets as sensitive.
