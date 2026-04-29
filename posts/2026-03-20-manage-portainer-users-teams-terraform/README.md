# How to Manage Portainer Users and Teams with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Users, Team, Access Control

Description: Learn how to define and manage Portainer users, teams, and team memberships using Terraform for consistent, version-controlled access control.

## Overview

Managing users and teams through Terraform ensures your access control configuration is version-controlled, reviewable via pull requests, and reproducible. It eliminates manual user management in the UI.

## Users Resource

```hcl
# users.tf

variable "team_members" {
  description = "Map of team members to create"
  type = map(object({
    username = string
    role     = number  # 1 = admin, 2 = standard user
  }))
  default = {
    alice = { username = "alice.smith", role = 2 }
    bob   = { username = "bob.jones", role = 2 }
    carol = { username = "carol.admin", role = 1 }
  }
}

# Create users from the map
resource "portainer_user" "team" {
  for_each = var.team_members

  username = each.value.username
  password = var.default_user_password  # Should be changed on first login
  role     = each.value.role
}

variable "default_user_password" {
  type      = string
  sensitive = true
}
```

## Teams Resource

```hcl
# teams.tf
locals {
  teams = ["backend", "frontend", "devops", "data-engineering"]
}

resource "portainer_team" "teams" {
  for_each = toset(local.teams)
  name     = each.key
}

output "team_ids" {
  value = { for k, v in portainer_team.teams : k => v.id }
}
```

## Team Memberships

```hcl
# team_memberships.tf
locals {
  memberships = {
    alice_backend  = { team = "backend",  user = "alice", role = 2 }
    bob_backend    = { team = "backend",  user = "bob",   role = 1 }  # Team leader
    alice_devops   = { team = "devops",   user = "alice", role = 2 }
    carol_devops   = { team = "devops",   user = "carol", role = 1 }
  }
}

resource "portainer_team_membership" "memberships" {
  for_each = local.memberships

  team_id = portainer_team.teams[each.value.team].id
  user_id = portainer_user.team[each.value.user].id
  role    = each.value.role  # 1 = leader, 2 = member
}
```

## Granting Team Access to Environments

```hcl
# environment_access.tf
data "portainer_role" "standard_user" {
  name = "Standard User"
}

data "portainer_role" "environment_admin" {
  name = "Environment administrator"
}

resource "portainer_environment" "staging" {
  name                = "staging"
  environment_address = "tcp://staging.example.com:9001"
  type                = 2

  team_access_policies = {
    (portainer_team.teams["backend"].id) = data.portainer_role.standard_user.roles[0].id
  }

  user_access_policies = {
    (portainer_user.team["carol"].id) = data.portainer_role.environment_admin.roles[0].id
  }
}
```

## Complete Example with Outputs

```hcl
# outputs.tf
output "user_summary" {
  description = "Summary of created users"
  value = {
    for name, user in portainer_user.team :
    name => {
      id       = user.id
      username = user.username
      role     = user.role == 1 ? "admin" : "standard"
    }
  }
}

output "team_memberships" {
  description = "Team membership summary"
  value = {
    for key, membership in portainer_team_membership.memberships :
    key => {
      team = split("_", key)[1]
      user = split("_", key)[0]
      role = membership.role == 1 ? "leader" : "member"
    }
  }
}
```

## Managing Users at Scale

```bash
# Apply the Terraform configuration
terraform apply

# Add a new team member by updating the team_members map
# Edit the team_members map, then:
terraform apply  # Only creates/modifies changed resources

# Remove a user (will delete from Portainer)
# Remove the user from the team_members map, then:
terraform apply
```

## CI/CD Integration for User Management

```yaml
# .github/workflows/portainer-users.yml
name: Manage Portainer Users

on:
  push:
    paths: ['terraform/users/**']
    branches: [main]

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        working-directory: terraform/users
        env:
          TF_VAR_portainer_api_key: ${{ secrets.PORTAINER_API_KEY }}
          TF_VAR_default_user_password: ${{ secrets.DEFAULT_USER_PASSWORD }}
        run: |
          terraform init
          terraform apply -auto-approve
```

## Conclusion

Managing Portainer users and teams with Terraform enables access control as code. Team membership changes go through Git pull requests, ensuring peer review before access is granted or revoked. This is especially valuable for compliance-sensitive environments.
