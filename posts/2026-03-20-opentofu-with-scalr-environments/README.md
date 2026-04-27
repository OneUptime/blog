# How to Use OpenTofu with Scalr Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Scalr, Environment, Multi-Tenant, RBAC, Governance

Description: Learn how to use Scalr environments to organize OpenTofu workspaces by team or application, apply environment-level policies, and manage access controls.

## Introduction

Scalr Environments group related workspaces and provide a boundary for policy enforcement, variable sharing, and access control. They map naturally to your organizational structure - one environment per team or application domain.

## Creating Environments

```hcl
provider "scalr" {
  hostname = "your-account.scalr.io"
  token    = var.scalr_token
}

# Environment per team/application

resource "scalr_environment" "platform" {
  name       = "platform-team"
  account_id = var.scalr_account_id

  # Provider configurations automatically assigned to all workspaces in this environment
  default_provider_configurations = [scalr_provider_configuration.aws.id]
}

resource "scalr_environment" "backend_team" {
  name       = "backend-services"
  account_id = var.scalr_account_id
}
```

## Environment-Level Variables

Variables set at the environment level are inherited by all workspaces:

```hcl
# Shared variables for all workspaces in the platform environment
resource "scalr_variable" "aws_region" {
  key            = "aws_default_region"
  value          = "us-east-1"
  category       = "terraform"
  environment_id = scalr_environment.platform.id
  description    = "Default AWS region for all platform workspaces"
}

resource "scalr_variable" "tags_environment" {
  key            = "global_tags"
  value          = jsonencode({ ManagedBy = "OpenTofu", Team = "platform" })
  category       = "terraform"
  environment_id = scalr_environment.platform.id
}
```

## Environment-Level Policies

Apply OPA policies across all workspaces in an environment:

```hcl
resource "scalr_policy_group" "platform_standards" {
  name            = "platform-standards"
  account_id      = var.scalr_account_id
  opa_version     = "0.59.0"
  vcs_provider_id = var.scalr_vcs_provider_id

  vcs_repo {
    identifier = "your-org/scalr-policies"
    path       = "policies/platform"
    branch     = "main"
  }
}

resource "scalr_policy_group_linkage" "platform" {
  policy_group_id = scalr_policy_group.platform_standards.id
  environment_id  = scalr_environment.platform.id
}
```

## Team Access Control

```hcl
resource "scalr_iam_team" "platform_engineers" {
  name       = "platform-engineers"
  account_id = var.scalr_account_id

  users = var.platform_team_user_ids
}

# Grant platform engineers access to the platform environment
resource "scalr_access_policy" "platform_access" {
  subject {
    type = "team"
    id   = scalr_iam_team.platform_engineers.id
  }

  scope {
    type = "environment"
    id   = scalr_environment.platform.id
  }

  role_ids = [var.scalr_admin_role_id]
}
```

## Cross-Environment Remote State

Share outputs between environments via Scalr's remote state:

```hcl
# In the backend-services environment workspace
data "terraform_remote_state" "networking" {
  backend = "remote"
  config = {
    hostname     = "your-account.scalr.io"
    organization = "your-org"
    workspaces = {
      name = "platform-networking"  # Workspace in platform environment
    }
  }
}

resource "aws_security_group" "app" {
  vpc_id = data.terraform_remote_state.networking.outputs.vpc_id
  # ...
}
```

## Conclusion

Scalr environments provide organizational boundaries for infrastructure teams. Environment-level variables and policies apply across all workspaces without per-workspace configuration, reducing overhead. The cross-environment remote state pattern enables loose coupling between teams while maintaining clear ownership boundaries.
