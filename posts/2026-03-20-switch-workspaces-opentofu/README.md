# How to Switch Between Workspaces in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Workspaces

Description: Learn how to switch between OpenTofu workspaces using tofu workspace select to manage different infrastructure environments from a single configuration.

## Introduction

After creating multiple workspaces, you need to switch between them to plan and apply changes to different environments. The `tofu workspace select` command changes the active workspace, causing all subsequent operations to use that workspace's state data.

## Basic Switching

```bash
# Switch to the production workspace

tofu workspace select production

# Output:
# Switched to workspace "production".

# Verify the switch
tofu workspace show
# production
```

## Switching and Verifying Context

```bash
# Switch to staging
tofu workspace select staging

# List to confirm the asterisk moved
tofu workspace list
#   default
#   production
# * staging
#   development

# Run a plan in the staging workspace
tofu plan -var-file=staging.tfvars
```

## Workflow: Deploy to Multiple Environments

```bash
# Deploy to staging first
tofu workspace select staging
tofu plan -var-file=staging.tfvars -out=staging.tfplan
tofu apply staging.tfplan

echo "Staging deployment complete"

# After validation, deploy to production
tofu workspace select production
tofu plan -var-file=production.tfvars -out=prod.tfplan

# Review carefully before applying to production
tofu show prod.tfplan
tofu apply prod.tfplan

echo "Production deployment complete"
```

## Workspace-Aware Configuration

Your configuration can behave differently per workspace:

```hcl
# variables.tf
variable "config" {
  type = map(object({
    instance_type  = string
    instance_count = number
    enable_deletion_protection = bool
  }))
  default = {
    development = {
      instance_type  = "db.t3.micro"
      instance_count = 1
      enable_deletion_protection = false
    }
    staging = {
      instance_type  = "db.t3.small"
      instance_count = 2
      enable_deletion_protection = false
    }
    production = {
      instance_type  = "db.t3.large"
      instance_count = 3
      enable_deletion_protection = true
    }
  }
}

# main.tf
resource "aws_db_instance" "app" {
  instance_class      = var.config[terraform.workspace].instance_type
  deletion_protection = var.config[terraform.workspace].enable_deletion_protection
  # ...
}
```

## CI/CD Pipeline Switching

```yaml
# GitHub Actions
jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]

    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2

      - name: Deploy to ${{ matrix.environment }}
        run: |
          tofu init
          tofu workspace select ${{ matrix.environment }}
          tofu apply -auto-approve -var-file="${{ matrix.environment }}.tfvars"
```

## Safety Check Before Switching

Add a safety check to prevent accidental production operations:

```bash
#!/bin/bash
# safe-switch.sh

TARGET_WORKSPACE="$1"

if [ "$TARGET_WORKSPACE" = "production" ]; then
  echo "WARNING: You are about to switch to PRODUCTION workspace"
  echo "Type 'yes' to confirm:"
  read -r CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted"
    exit 1
  fi
fi

tofu workspace select "$TARGET_WORKSPACE"
echo "Switched to: $(tofu workspace show)"
```

## Handling Missing Workspaces

If you try to select a workspace that doesn't exist:

```bash
tofu workspace select nonexistent
# Error: Workspace "nonexistent" doesn't exist.
# You can create a new workspace with the "workspace new" command.

# Create and switch in one step
tofu workspace select -or-create nonexistent
```

## Returning to Default

```bash
# Always return to default after work is done
tofu workspace select default
tofu workspace show
# default
```

## Conclusion

`tofu workspace select` is the mechanism for navigating between infrastructure environments. Build safe workflows around it - verify the target workspace before running destructive operations, use workspace-aware configurations to prevent mismatches, and implement confirmation prompts for production workspace operations in your scripts. Always be explicit about which workspace you're operating on to avoid accidental changes to the wrong environment.
