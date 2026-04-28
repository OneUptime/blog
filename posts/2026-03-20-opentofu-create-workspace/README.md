# How to Create a New Workspace in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Workspaces

Description: Learn how to create new workspaces in OpenTofu to manage multiple independent states from a single configuration.

## Introduction

Workspaces allow a single OpenTofu configuration to manage multiple independent state files. Each workspace has its own state, so changes in one workspace do not affect another. The `tofu workspace new` command creates a new workspace and immediately switches to it.

## Creating a Workspace

```bash
# Create a new workspace named "staging"

tofu workspace new staging

# Output:
# Created and switched to workspace "staging"!
#
# You're now on a new, empty workspace. Workspaces isolate their state,
# so if you run "tofu plan" OpenTofu will not see any existing state
# for this configuration.
```

## Creating Multiple Workspaces

```bash
tofu workspace new development
tofu workspace new staging
tofu workspace new production

# List all workspaces
tofu workspace list
#   default
#   development
#   staging
# * production   (currently selected)
```

## Creating a Workspace from Existing State

Copy state from another workspace when creating:

```bash
# Create "staging" workspace initialized with production state
tofu workspace new staging -state=production.tfstate
```

This is useful when bootstrapping a new environment from an existing one.

## What Happens in the Backend

For the local backend, workspaces create separate state files:
```text
terraform.tfstate.d/
├── staging/
│   └── terraform.tfstate
└── production/
    └── terraform.tfstate
```

For S3, the state path is `<workspace_key_prefix>/<workspace_name>/<key>` (the default `workspace_key_prefix` is `env:`):
```text
s3://bucket/env:/staging/terraform.tfstate
s3://bucket/env:/production/terraform.tfstate
```

## Using the Workspace in Configuration

```hcl
# Reference the current workspace name in resources
resource "aws_s3_bucket" "app" {
  bucket = "acme-app-${terraform.workspace}"

  tags = {
    Environment = terraform.workspace
  }
}
```

## Workspace-Specific Settings with Locals

```hcl
locals {
  workspace_config = {
    staging = {
      instance_type = "t3.small"
      min_capacity  = 1
    }
    production = {
      instance_type = "t3.large"
      min_capacity  = 3
    }
  }

  config = local.workspace_config[terraform.workspace]
}

resource "aws_autoscaling_group" "app" {
  min_size          = local.config.min_capacity
  # ...
}
```

## Running Plans in a New Workspace

After creating a workspace, plan shows no existing resources (empty state):

```bash
tofu workspace new staging
tofu plan    # Plans creating everything from scratch
tofu apply   # Creates all resources in the staging workspace
```

## Conclusion

Use `tofu workspace new <name>` to create isolated environments from a single configuration. The new workspace starts with empty state, so `tofu apply` will create all configured resources fresh. Reference `terraform.workspace` in your configuration to customize resource names, sizes, or counts per environment.
