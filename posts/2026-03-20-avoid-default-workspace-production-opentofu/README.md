# How to Avoid Using Default Workspace for Production in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Workspaces, Best Practice, Production Safety, Infrastructure as Code

Description: Learn why using the default workspace for production is risky and how to structure environment isolation properly with OpenTofu.

## Introduction

The `default` workspace is OpenTofu's initial workspace. Using it for production infrastructure creates a dangerous ambiguity - the workspace name provides no signal about what environment you're operating in, and switching to a non-default workspace accidentally may go unnoticed. This post explains why and how to structure production environments safely.

## Why Default Workspace Is Risky for Production

The `default` workspace lacks environmental clarity.

```bash
# Dangerous: No clear indication of what environment you're in

tofu workspace show
# default

# Is this dev? staging? prod? You have to check other signals to know.

# vs clear environment signal:
tofu workspace show
# production

# OR better yet - use separate directories:
pwd
# /infrastructure/environments/prod
```

## The Accident Waiting to Happen

The default workspace can be silently active when you think you're elsewhere.

```bash
# Developer creates a staging workspace for testing
tofu workspace new staging
tofu workspace select staging
tofu apply  # applies to staging

# Later, runs from a different initialized working directory
# that points at the same backend
tofu workspace show
# default  ← this working directory is back on default

tofu apply  # accidentally applies to production!
```

## Option 1: Prohibit Default Workspace in Code

Add a check that fails if run in the default workspace.

```hcl
# main.tf
# Fail if someone runs from the default workspace
resource "terraform_data" "workspace_check" {
  lifecycle {
    precondition {
      condition     = terraform.workspace != "default"
      error_message = "ERROR: Never use the 'default' workspace. Use 'staging' or 'production'."
    }
  }
}
```

Or use a local with a precondition.

```hcl
locals {
  allowed_workspaces = ["staging", "production", "dev"]
  workspace_valid    = contains(local.allowed_workspaces, terraform.workspace)
}

# This will fail at plan time if workspace is not explicitly allowed
resource "terraform_data" "workspace_guard" {
  input = terraform.workspace

  lifecycle {
    precondition {
      condition     = local.workspace_valid
      error_message = "Invalid workspace '${terraform.workspace}'. Must be one of: ${join(", ", local.allowed_workspaces)}"
    }
  }
}
```

## Option 2: Use Separate Directories Per Environment (Recommended)

This is the superior approach - no workspace confusion possible.

```text
environments/
├── dev/
│   ├── main.tf
│   ├── backend.tf  → key: dev/terraform.tfstate
│   └── terraform.tfvars
├── staging/
│   ├── main.tf
│   ├── backend.tf  → key: staging/terraform.tfstate
│   └── terraform.tfvars
└── prod/
    ├── main.tf
    ├── backend.tf  → key: prod/terraform.tfstate
    └── terraform.tfvars
```

```bash
# The directory makes the environment unambiguous
cd environments/prod
tofu workspace show  # always 'default' but this dir IS prod
tofu plan            # clearly operating on production
```

## Option 3: Guard in CI/CD Pipelines

Check workspace before applying in CI/CD.

```bash
#!/bin/bash
# scripts/safe-apply.sh

REQUIRED_WORKSPACE="${1:-}"
CURRENT_WORKSPACE=$(tofu workspace show)

if [ "$CURRENT_WORKSPACE" == "default" ]; then
  echo "ERROR: Refusing to apply in default workspace."
  echo "Explicitly select a workspace: tofu workspace select [env]"
  exit 1
fi

if [ -n "$REQUIRED_WORKSPACE" ] && [ "$CURRENT_WORKSPACE" != "$REQUIRED_WORKSPACE" ]; then
  echo "ERROR: Expected workspace '$REQUIRED_WORKSPACE' but got '$CURRENT_WORKSPACE'"
  exit 1
fi

tofu apply plan.tfplan
```

## Summary

The default workspace provides no environmental signal and creates easy mistakes. For persistent environments (dev, staging, prod), use separate directories with separate state backends - the directory path itself makes the environment unambiguous. Reserve workspaces for ephemeral use cases like PR environments. If you must use workspaces for environments, add validation code that fails if run in the default workspace, and always show the current workspace prominently in your terminal prompt and CI/CD logs.
