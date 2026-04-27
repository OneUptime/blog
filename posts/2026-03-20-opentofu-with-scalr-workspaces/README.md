# How to Use OpenTofu with Scalr Workspaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Scalr, Workspaces, Remote Backend, GitOps, CI/CD

Description: Learn how to configure Scalr workspaces for OpenTofu deployments, enabling remote state management, team collaboration, and policy enforcement at scale.

## Introduction

Scalr is a Terraform/OpenTofu automation platform that provides workspace-based state management, team access controls, and policy enforcement. This guide covers configuring Scalr workspaces for OpenTofu deployments.

## Configuring the Scalr Backend

```hcl
# backend.tf

terraform {
  backend "remote" {
    hostname     = "your-account.scalr.io"
    organization = "your-org"

    workspaces {
      name = "prod-networking"
    }
  }
}
```

## Workspace Variables

```hcl
# Set workspace-specific variables in Scalr via the provider
provider "scalr" {
  hostname = "your-account.scalr.io"
  token    = var.scalr_token
}

# Create a workspace for each environment
resource "scalr_workspace" "environments" {
  for_each = toset(["dev", "staging", "prod"])

  name           = "app-${each.key}"
  environment_id = scalr_environment.production.id
  iac_platform      = "opentofu"
  terraform_version = "1.7.0"

  # Auto-apply changes pushed to the workspace
  auto_apply     = each.key == "prod" ? false : true

  # VCS configuration
  vcs_provider_id = scalr_vcs_provider.github.id
  working_directory = "environments/${each.key}"
}

# Set environment-specific variables
resource "scalr_variable" "environment" {
  for_each = toset(["dev", "staging", "prod"])

  key          = "environment"
  value        = each.key
  category     = "terraform"
  workspace_id = scalr_workspace.environments[each.key].id
}
```

## Team Access Configuration

```hcl
resource "scalr_iam_team" "platform" {
  name        = "platform-team"
  account_id  = var.scalr_account_id
  description = "Platform engineering team"
}

resource "scalr_workspace_run_schedule" "prod" {
  workspace_id = scalr_workspace.environments["prod"].id
  # Schedule drift detection check
  apply_schedule  = ""
  destroy_schedule = ""
}
```

## Remote Operations

When configured with Scalr backend, OpenTofu operations run remotely:

```bash
# Initialize with Scalr backend
tofu init

# Plan runs remotely on Scalr infrastructure
tofu plan

# Apply runs remotely with Scalr's audit logging
tofu apply

# View run history in Scalr dashboard
```

## Using Scalr for Workspace Variables with for_each

```hcl
variable "workspace_vars" {
  type = map(map(string))
  default = {
    "dev" = {
      instance_type = "t3.micro"
      db_class      = "db.t3.micro"
    }
    "prod" = {
      instance_type = "m5.large"
      db_class      = "db.r6g.large"
    }
  }
}

resource "scalr_variable" "workspace_config" {
  for_each = {
    for item in flatten([
      for env, vars in var.workspace_vars : [
        for key, value in vars : {
          env   = env
          key   = key
          value = value
        }
      ]
    ]) : "${item.env}-${item.key}" => item
  }

  key          = each.value.key
  value        = each.value.value
  category     = "terraform"
  workspace_id = scalr_workspace.environments[each.value.env].id
}
```

## Conclusion

Scalr workspaces provide a full-featured remote execution environment for OpenTofu. Workspace variables let you manage environment-specific configuration centrally without committing sensitive values to version control. The remote execution model ensures all OpenTofu operations are logged, auditable, and subject to policy enforcement.
