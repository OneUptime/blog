# How to Manage Portainer Users and Teams with Terraform - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Users, Team, RBAC

Description: Learn how to define and manage Portainer users, teams, and team memberships using Terraform for automated, version-controlled RBAC configuration.

## Introduction

Managing users and teams in Portainer through Terraform gives you version-controlled RBAC configuration. New team members can be onboarded by adding a few lines of Terraform code, and offboarding is as simple as removing them and running `terraform apply`. This guide covers comprehensive user and team management with Terraform.

## Prerequisites

- Portainer Terraform provider configured
- Terraform v1.0+
- Admin-level API key or admin username/password

## Step 1: Basic User Management

```hcl
# users.tf

# Standard developer user

resource "portainer_user" "alice" {
  username = "alice.smith"
  password = var.initial_passwords["alice"]
  role     = 2  # Standard user

  lifecycle {
    # Don't reset password on subsequent applies
    ignore_changes = [password]
  }
}

resource "portainer_user" "bob" {
  username = "bob.jones"
  password = var.initial_passwords["bob"]
  role     = 2

  lifecycle {
    ignore_changes = [password]
  }
}

# Admin user
resource "portainer_user" "devops_lead" {
  username = "charlie.admin"
  password = var.initial_passwords["charlie"]
  role     = 1  # Administrator

  lifecycle {
    ignore_changes = [password]
  }
}

# Variables for initial passwords
variable "initial_passwords" {
  description = "Initial passwords for new users"
  type        = map(string)
  sensitive   = true
}
```

## Step 2: Team Definitions

```hcl
# teams.tf

resource "portainer_team" "backend" {
  name = "backend-engineers"
}

resource "portainer_team" "frontend" {
  name = "frontend-engineers"
}

resource "portainer_team" "devops" {
  name = "platform-devops"
}

resource "portainer_team" "qa" {
  name = "quality-assurance"
}

resource "portainer_team" "data" {
  name = "data-engineering"
}
```

## Step 3: Team Memberships

```hcl
# team_memberships.tf

# Backend team members
resource "portainer_team_membership" "alice_backend" {
  team_id = portainer_team.backend.id
  user_id = portainer_user.alice.id
  role    = 2  # Regular member
}

resource "portainer_team_membership" "bob_backend" {
  team_id = portainer_team.backend.id
  user_id = portainer_user.bob.id
  role    = 1  # Team leader
}

# DevOps team
resource "portainer_team_membership" "charlie_devops" {
  team_id = portainer_team.devops.id
  user_id = portainer_user.devops_lead.id
  role    = 1  # Team leader
}
```

## Step 4: Using Variables for User Lists

```hcl
# variables.tf - Define user configuration as data

variable "users" {
  description = "Map of user configurations"
  type = map(object({
    role          = number
    team          = string
    team_role     = number
    initial_pass  = string
  }))
  sensitive = true
}

# terraform.tfvars
# users = {
#   "alice.smith" = {
#     role         = 2
#     team         = "backend"
#     team_role    = 2
#     initial_pass = "TempPass123!"
#   }
# }
```

## Step 5: Dynamic Resource Creation with for_each

```hcl
# dynamic_users.tf - Create users from a map

variable "team_members" {
  description = "Map of team member configurations"
  type = map(object({
    username     = string
    role         = number
    initial_pass = string
  }))
}

resource "portainer_user" "members" {
  for_each = var.team_members

  username = each.value.username
  password = each.value.initial_pass
  role     = each.value.role

  lifecycle {
    ignore_changes = [password]
  }
}

# Example variable value:
# team_members = {
#   alice = { username = "alice", role = 2, initial_pass = "TempPass!" }
#   bob   = { username = "bob",   role = 2, initial_pass = "TempPass!" }
# }
```

## Step 6: Team-to-Environment Access Grants

On Portainer Business Edition, combine this with environment access:

```hcl
# access_policies.tf

data "portainer_role" "helpdesk" {
  name = "HelpDesk"
}

data "portainer_role" "environment_admin" {
  name = "Environment Administrator"
}

# Production: backend gets read-only access, devops gets environment administrator access
resource "portainer_environment" "production" {
  name                = "production"
  environment_address = "tcp://production-agent.example.com:9001"
  type                = 2

  team_access_policies = {
    (tostring(portainer_team.backend.id)) = data.portainer_role.helpdesk.roles[0].id
    (tostring(portainer_team.devops.id))  = data.portainer_role.environment_admin.roles[0].id
  }
}

# Staging: devops gets environment administrator access
resource "portainer_environment" "staging" {
  name                = "staging"
  environment_address = "tcp://staging-agent.example.com:9001"
  type                = 2

  team_access_policies = {
    (tostring(portainer_team.devops.id)) = data.portainer_role.environment_admin.roles[0].id
  }
}
```

## Step 7: Outputs

```hcl
# outputs.tf

output "team_ids" {
  description = "Map of team names to IDs"
  value = {
    backend  = portainer_team.backend.id
    frontend = portainer_team.frontend.id
    devops   = portainer_team.devops.id
    qa       = portainer_team.qa.id
  }
}

output "user_ids" {
  description = "Map of usernames to IDs"
  value = {
    alice   = portainer_user.alice.id
    bob     = portainer_user.bob.id
    charlie = portainer_user.devops_lead.id
  }
}
```

## Step 8: Onboarding a New User

To onboard a new team member, simply add resources:

```hcl
# Add to users.tf
resource "portainer_user" "diana" {
  username = "diana.chen"
  password = var.initial_passwords["diana"]
  role     = 2
  lifecycle { ignore_changes = [password] }
}

# Add to team_memberships.tf
resource "portainer_team_membership" "diana_frontend" {
  team_id = portainer_team.frontend.id
  user_id = portainer_user.diana.id
  role    = 2
}
```

Then:

```bash
# Preview changes
terraform plan

# Apply: creates user and adds to team
terraform apply
```

## Step 9: Offboarding a User

To remove a user, delete their Terraform resources:

```bash
# Remove the user and their team memberships from .tf files
# Then:
terraform plan    # Shows: will destroy portainer_team_membership.diana_frontend and portainer_user.diana
terraform apply   # Removes user from Portainer
```

## Conclusion

Managing Portainer users and teams with Terraform provides a clear, auditable record of who has access to what. Onboarding and offboarding becomes a code review + merge + apply workflow, ensuring access changes are visible, reversible, and tracked. Use `lifecycle { ignore_changes = [password] }` to avoid overwriting passwords after initial creation, and store initial passwords securely in a secrets manager or Terraform Cloud variables.
