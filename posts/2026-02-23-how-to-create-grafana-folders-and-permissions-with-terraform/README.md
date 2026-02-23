# How to Create Grafana Folders and Permissions with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Grafana, Permissions, RBAC, Infrastructure as Code

Description: Learn how to create Grafana folders and manage dashboard permissions using Terraform for organized and secure monitoring access control.

---

Grafana folders organize dashboards into logical groups and provide the permission boundary for controlling who can view and edit them. Managing folders and permissions through Terraform ensures your Grafana organization is structured consistently. This guide covers creating folders, setting permissions, and managing team access.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_auth
}

variable "grafana_url" { type = string }
variable "grafana_auth" { type = string; sensitive = true }
```

## Creating Folders

```hcl
# Create folders for organizing dashboards
resource "grafana_folder" "infrastructure" {
  title = "Infrastructure"
}

resource "grafana_folder" "applications" {
  title = "Applications"
}

resource "grafana_folder" "business" {
  title = "Business Metrics"
}

resource "grafana_folder" "security" {
  title = "Security"
}

resource "grafana_folder" "alerts" {
  title = "Alert Rules"
}
```

## Creating Teams

```hcl
resource "grafana_team" "platform" {
  name  = "Platform Engineering"
  email = "platform@company.com"
}

resource "grafana_team" "developers" {
  name  = "Developers"
  email = "dev@company.com"
}

resource "grafana_team" "security" {
  name  = "Security Team"
  email = "security@company.com"
}

# Add members to teams
resource "grafana_team_members" "platform" {
  team_id = grafana_team.platform.id
  members = [
    "alice@company.com",
    "bob@company.com",
  ]
}
```

## Setting Folder Permissions

```hcl
# Platform team gets Editor access to infrastructure dashboards
resource "grafana_folder_permission" "infrastructure" {
  folder_uid = grafana_folder.infrastructure.uid

  permissions {
    team_id    = grafana_team.platform.id
    permission = "Edit"
  }

  permissions {
    team_id    = grafana_team.developers.id
    permission = "View"
  }

  permissions {
    team_id    = grafana_team.security.id
    permission = "View"
  }
}

# Developers get Editor access to application dashboards
resource "grafana_folder_permission" "applications" {
  folder_uid = grafana_folder.applications.uid

  permissions {
    team_id    = grafana_team.developers.id
    permission = "Edit"
  }

  permissions {
    team_id    = grafana_team.platform.id
    permission = "Edit"
  }
}

# Security team gets Admin access to security dashboards
resource "grafana_folder_permission" "security" {
  folder_uid = grafana_folder.security.uid

  permissions {
    team_id    = grafana_team.security.id
    permission = "Admin"
  }

  permissions {
    team_id    = grafana_team.platform.id
    permission = "View"
  }
}
```

## Dynamic Folder and Permission Management

```hcl
variable "folder_config" {
  type = map(object({
    editor_teams = list(string)
    viewer_teams = list(string)
  }))
  default = {
    "Infrastructure" = {
      editor_teams = ["Platform Engineering"]
      viewer_teams = ["Developers", "Security Team"]
    }
    "Applications" = {
      editor_teams = ["Developers", "Platform Engineering"]
      viewer_teams = ["Security Team"]
    }
    "Business" = {
      editor_teams = ["Platform Engineering"]
      viewer_teams = ["Developers"]
    }
  }
}

resource "grafana_folder" "dynamic" {
  for_each = var.folder_config
  title    = each.key
}

locals {
  team_map = {
    "Platform Engineering" = grafana_team.platform.id
    "Developers"           = grafana_team.developers.id
    "Security Team"        = grafana_team.security.id
  }
}
```

## Nested Folder Structure

Grafana supports nested folders for more granular organization:

```hcl
# Create parent folder
resource "grafana_folder" "team_platform" {
  title = "Platform Team"
}

# Create nested sub-folders under the parent
resource "grafana_folder" "platform_kubernetes" {
  title      = "Kubernetes"
  parent_folder_uid = grafana_folder.team_platform.uid
}

resource "grafana_folder" "platform_databases" {
  title      = "Databases"
  parent_folder_uid = grafana_folder.team_platform.uid
}

resource "grafana_folder" "platform_networking" {
  title      = "Networking"
  parent_folder_uid = grafana_folder.team_platform.uid
}

# Set permissions at the parent level - they cascade to children
resource "grafana_folder_permission" "team_platform" {
  folder_uid = grafana_folder.team_platform.uid

  permissions {
    team_id    = grafana_team.platform.id
    permission = "Admin"
  }

  permissions {
    team_id    = grafana_team.developers.id
    permission = "View"
  }
}
```

## Dashboard-Level Permissions

For cases where you need finer control than folder-level permissions:

```hcl
# Override permissions on a specific dashboard
resource "grafana_dashboard_permission" "sensitive_dashboard" {
  dashboard_uid = grafana_dashboard.sensitive.uid

  permissions {
    team_id    = grafana_team.security.id
    permission = "Edit"
  }

  # No other teams get access - overrides folder permissions
}
```

## Service Account Access

Create service accounts for automated dashboard management:

```hcl
# Create a service account for CI/CD dashboard deployment
resource "grafana_service_account" "deploy" {
  name        = "dashboard-deployer"
  role        = "Editor"
  is_disabled = false
}

# Create a token for the service account
resource "grafana_service_account_token" "deploy" {
  name               = "deploy-token"
  service_account_id = grafana_service_account.deploy.id
}

# Output the token for CI/CD configuration
output "deploy_token" {
  value     = grafana_service_account_token.deploy.key
  sensitive = true
}
```

## Organization Settings

```hcl
# Create a Grafana organization
resource "grafana_organization" "main" {
  name         = "Production Monitoring"
  admin_user   = "admin"
  create_users = true
  admins       = ["admin@company.com"]
  editors      = ["platform-lead@company.com"]
  viewers      = ["stakeholder@company.com"]
}
```

## Best Practices

Organize folders by team ownership or service domain. Use teams rather than individual users for permission assignments. Give most users Viewer access and only grant Editor access to team members who maintain the dashboards. Use Admin sparingly and only for folder-level management. Create a separate folder for alert rules to manage alert permissions independently from dashboards. Use consistent naming conventions for both folders and teams.

For creating the dashboards that go into these folders, see our guide on [Grafana dashboards](https://oneuptime.com/blog/post/2026-02-23-how-to-create-grafana-dashboards-with-terraform/view).

## Conclusion

Grafana folders and permissions managed through Terraform provide a structured, secure approach to organizing your monitoring visualizations. By defining the folder hierarchy and access controls as code, you ensure that the right teams can view and edit the right dashboards. This is especially important in large organizations where multiple teams share a single Grafana instance.
