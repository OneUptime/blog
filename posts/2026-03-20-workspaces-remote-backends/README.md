# How to Use Workspaces with Remote Backends in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Workspaces, State Management

Description: Learn how OpenTofu workspaces interact with remote backends like S3, GCS, and Azure, including state file organization and workspace-specific backend configurations.

## Introduction

When you use workspaces with remote backends, OpenTofu automatically organizes workspace state files in a structured path hierarchy within the backend. Understanding how each backend handles workspace state helps you design your backend storage structure and manage workspace state effectively.

## S3 Backend with Workspaces

```hcl
terraform {
  backend "s3" {
    bucket               = "my-terraform-state"
    key                  = "app/terraform.tfstate"
    region               = "us-east-1"
    encrypt              = true
    dynamodb_table        = "terraform-state-locks"
    workspace_key_prefix = "envs"  # Custom prefix (default: "env:")
  }
}
```

State file structure:

```text
S3 bucket: my-terraform-state
├── app/terraform.tfstate               ← default workspace
└── envs/
    ├── production/
    │   └── app/terraform.tfstate       ← production workspace
    ├── staging/
    │   └── app/terraform.tfstate       ← staging workspace
    └── development/
        └── app/terraform.tfstate       ← development workspace
```

## GCS Backend with Workspaces

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "app"
  }
}
```

State file structure in GCS:

```text
Bucket: my-terraform-state-bucket
├── app/default.tfstate         ← default workspace
├── app/production.tfstate      ← production workspace
├── app/staging.tfstate         ← staging workspace
└── app/development.tfstate     ← development workspace
```

GCS uses a flat naming convention (no subdirectory per workspace).

## Azure Backend with Workspaces

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "app/terraform.tfstate"
  }
}
```

Azure Blob Storage state file structure:

```text
Container: tfstate
├── app/terraform.tfstate                       ← default workspace
├── app/terraform.tfstateenv:production         ← production workspace
├── app/terraform.tfstateenv:staging            ← staging workspace
└── app/terraform.tfstateenv:development        ← development workspace
```

The azurerm backend stores non-default workspace state by appending `env:<workspace_name>` directly to the configured `key`.

## PostgreSQL Backend with Workspaces

```hcl
terraform {
  backend "pg" {
    conn_str    = "postgresql://..."
    schema_name = "terraform_remote_state"
  }
}
```

PostgreSQL stores workspace state as rows in the `states` table inside the configured schema (default `terraform_remote_state`):

```sql
-- View workspace states
SELECT id, name FROM terraform_remote_state.states;
-- the `name` column holds the workspace name; each workspace is a row
```

## Workspace-Aware CI/CD with Remote Backends

```yaml
# GitHub Actions: deploy to multiple environments

name: Deploy

on:
  push:
    branches: [main, staging, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Determine Workspace
        id: workspace
        run: |
          BRANCH="${{ github.ref_name }}"
          case "$BRANCH" in
            main)    echo "workspace=production" >> $GITHUB_OUTPUT ;;
            staging) echo "workspace=staging" >> $GITHUB_OUTPUT ;;
            develop) echo "workspace=development" >> $GITHUB_OUTPUT ;;
            *)       echo "workspace=development" >> $GITHUB_OUTPUT ;;
          esac

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Deploy
        env:
          TF_WORKSPACE: ${{ steps.workspace.outputs.workspace }}
        run: |
          tofu init
          # TF_WORKSPACE env var auto-selects the workspace
          tofu apply -auto-approve \
            -var-file="${{ steps.workspace.outputs.workspace }}.tfvars"
```

## Using TF_WORKSPACE Environment Variable

```bash
# Set workspace via environment variable
export TF_WORKSPACE="production"

# OpenTofu automatically uses this workspace
tofu plan  # Uses production workspace
tofu apply # Uses production workspace

# Unset to return to default
unset TF_WORKSPACE
```

## Cross-Workspace State References

Reference another workspace's state using `terraform_remote_state`:

```hcl
# Reference the networking workspace's state from any workspace
data "terraform_remote_state" "networking" {
  backend   = "s3"
  workspace = "default"  # Or terraform.workspace to use same workspace

  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Or specifically target another workspace
data "terraform_remote_state" "networking_prod" {
  backend   = "s3"
  workspace = "production"

  config = {
    bucket               = "my-terraform-state"
    key                  = "networking/terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "envs"
  }
}
```

## Conclusion

Understanding how workspaces organize state in remote backends is essential for designing your state storage strategy. S3, Azure, and GCS each use slightly different path conventions for workspace state. By using `TF_WORKSPACE` in CI/CD pipelines and understanding the storage structure, you can build reliable multi-environment deployment automation that leverages workspace isolation effectively.
