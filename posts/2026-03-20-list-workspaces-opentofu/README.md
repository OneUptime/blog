# How to List All Workspaces in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Workspaces

Description: Learn how to list all available OpenTofu workspaces and understand the output format to navigate your infrastructure environments.

## Introduction

The `tofu workspace list` command shows all workspaces in your current configuration's backend when that backend supports multiple workspaces. Understanding this command helps you verify available environments, see which workspace is currently active, and audit your workspace setup.

## Basic Usage

```bash
# List all workspaces

tofu workspace list

# Example output:
#   default
# * production
#   staging
#   development
```

The asterisk (`*`) indicates the currently active workspace.

## Understanding the Output

```bash
tofu workspace list

  default       ← Always exists, cannot be deleted
* production    ← Currently active workspace (asterisk)
  staging
  development
```

The `default` workspace is always present and cannot be deleted. The order of the remaining workspaces depends on the backend.

## After Creating Workspaces

```bash
# Start with just the default
tofu workspace list
# * default

# Create new workspaces
tofu workspace new staging
tofu workspace new production

# List again
tofu workspace list
#   default
# * production
#   staging
```

## Checking the Current Workspace Programmatically

```bash
# Get just the current workspace name (no list formatting)
tofu workspace show
# staging

# Use in scripts
CURRENT_WS=$(tofu workspace show)
echo "Currently in: $CURRENT_WS"

# Conditional logic based on workspace
if [ "$(tofu workspace show)" = "production" ]; then
  echo "Deploying to production - extra review required"
fi
```

## Combining with grep and awk

```bash
# Check if a workspace exists
tofu workspace list | sed 's/^[* ]*//' | grep -Fqx -- "production" && echo "Exists" || echo "Not found"

# List all non-default workspaces
tofu workspace list | sed 's/^[* ]*//' | grep -Fvx -- "default"

# Count workspaces
tofu workspace list | sed 's/^[* ]*//' | grep -c .
```

## Verifying Workspace Count in a Pipeline

```bash
#!/bin/bash
# verify-workspaces.sh

REQUIRED_WORKSPACES=("development" "staging" "production")

echo "Checking required workspaces..."
for ws in "${REQUIRED_WORKSPACES[@]}"; do
  if tofu workspace list | sed 's/^[* ]*//' | grep -Fqx -- "$ws"; then
    echo "  ✓ $ws exists"
  else
    echo "  ✗ $ws is MISSING"
    tofu workspace new "$ws"
    echo "  + Created $ws"
  fi
done

echo "Workspace list:"
tofu workspace list
```

## Backend-Specific Workspace Storage

Different backends store workspace state at different locations:

### S3 Backend
```bash
# List non-default workspace state objects in S3
aws s3 ls s3://my-terraform-state/env:/ --recursive
# (or your custom workspace_key_prefix; the default workspace stays at the configured key)
```

### Local Backend
```bash
# List non-default workspace state files locally
find terraform.tfstate.d -maxdepth 2 -name terraform.tfstate -print
# terraform.tfstate.d/development/terraform.tfstate
# terraform.tfstate.d/production/terraform.tfstate
# terraform.tfstate.d/staging/terraform.tfstate
```

### GCS Backend
```bash
# List workspace state files in GCS (if prefix = "prod/")
gsutil ls gs://my-terraform-state-bucket/prod/
# gs://my-terraform-state-bucket/prod/default.tfstate
# gs://my-terraform-state-bucket/prod/production.tfstate
# gs://my-terraform-state-bucket/prod/staging.tfstate
```

## Cross-Configuration Workspace Audit

When multiple configurations share the same backend bucket, audit all workspaces:

```bash
#!/bin/bash
# For S3 backend with workspace_key_prefix = "envs"
aws s3 ls s3://my-state-bucket/envs/ \
  --recursive

# For local backend
find . \( -path "*/terraform.tfstate" -o -path "*/terraform.tfstate.d/*/terraform.tfstate" \) -print
```

## Conclusion

`tofu workspace list` is a simple but essential command for workspace management. Use it to verify available environments, confirm your current active workspace, and audit the workspaces in your configuration. Combine it with `tofu workspace show` for scripting - the latter returns just the current workspace name, making it ideal for conditional logic in CI/CD pipelines.
