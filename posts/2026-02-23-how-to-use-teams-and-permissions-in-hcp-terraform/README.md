# How to Use Teams and Permissions in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Teams, Permissions, Access Control, IAM

Description: A practical guide to setting up teams and managing permissions in HCP Terraform to enforce proper access control across your organization.

---

Managing who can do what in your infrastructure-as-code workflow is not optional - it is a requirement for any team that takes security seriously. HCP Terraform provides a robust teams and permissions model that lets you control access at the organization, workspace, and project level.

This guide covers everything you need to know about setting up teams, assigning permissions, and following best practices for access control in HCP Terraform.

## Understanding the Permission Model

HCP Terraform uses a layered permission system. At the top level, you have organization-level permissions. Below that, you have workspace-level and project-level permissions. Teams are the primary unit for grouping users and assigning access.

There are a few built-in groups to be aware of:

- **Owners**: Full administrative access to everything. Every organization has this team by default.
- **Custom Teams**: Teams you create with specific permissions tailored to roles in your organization.

## Creating Teams

### Through the UI

1. Go to your HCP Terraform organization
2. Navigate to **Settings** > **Teams**
3. Click **Create Team**
4. Enter a team name and optionally configure visibility
5. Click **Create Team**

### Through the API

```bash
# Create a new team via the API
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "teams",
      "attributes": {
        "name": "platform-engineering",
        "visibility": "organization",
        "organization-access": {
          "manage-workspaces": false,
          "manage-policies": false,
          "manage-vcs-settings": false,
          "manage-providers": false,
          "manage-modules": true,
          "manage-run-tasks": false
        }
      }
    }
  }' \
  https://app.terraform.io/api/v2/organizations/your-org/teams
```

### Using the Terraform Provider

You can also manage teams as code using the `tfe` provider, which is arguably the best approach since it keeps your access control versioned alongside your infrastructure:

```hcl
# Configure the TFE provider
provider "tfe" {
  # Token can be set via TFE_TOKEN environment variable
}

# Create a team for platform engineers
resource "tfe_team" "platform" {
  name         = "platform-engineering"
  organization = "your-org"
  visibility   = "organization"

  organization_access {
    manage_workspaces  = false
    manage_modules     = true
    manage_providers   = false
    manage_policies    = false
    manage_run_tasks   = false
    manage_vcs_settings = false
  }
}

# Create a team for developers with limited access
resource "tfe_team" "developers" {
  name         = "developers"
  organization = "your-org"
  visibility   = "organization"

  organization_access {
    manage_workspaces = false
    manage_modules    = false
    manage_providers  = false
  }
}
```

## Adding Members to Teams

Once a team exists, you can add users to it:

```hcl
# Add a member to the platform team
resource "tfe_team_member" "platform_member" {
  team_id  = tfe_team.platform.id
  username = "john-doe"
}

# Or add multiple members using organization membership
resource "tfe_organization_membership" "dev_user" {
  organization = "your-org"
  email        = "developer@example.com"
}

resource "tfe_team_organization_member" "dev_team_member" {
  team_id                    = tfe_team.developers.id
  organization_membership_id = tfe_organization_membership.dev_user.id
}
```

## Organization-Level Permissions

Organization-level permissions control what a team can do across the entire organization. Here are the key permissions:

| Permission | What It Controls |
|---|---|
| `manage_workspaces` | Create and manage all workspaces |
| `manage_policies` | Create and manage Sentinel/OPA policies |
| `manage_vcs_settings` | Configure VCS provider connections |
| `manage_modules` | Publish and manage private registry modules |
| `manage_providers` | Publish and manage private registry providers |
| `manage_run_tasks` | Configure run task integrations |
| `manage_projects` | Create and manage projects |

## Workspace-Level Permissions

Workspace permissions are where you get the most granular control. HCP Terraform offers several preset permission levels:

### Preset Access Levels

- **Read**: View workspace, view runs, view state
- **Plan**: Everything in Read, plus queue plans
- **Write**: Everything in Plan, plus apply runs, lock/unlock workspace
- **Admin**: Full control over workspace settings, team access, and can delete the workspace

```hcl
# Grant the developers team write access to a specific workspace
resource "tfe_team_access" "dev_staging" {
  access       = "write"
  team_id      = tfe_team.developers.id
  workspace_id = tfe_workspace.staging.id
}

# Grant the platform team admin access
resource "tfe_team_access" "platform_staging" {
  access       = "admin"
  team_id      = tfe_team.platform.id
  workspace_id = tfe_workspace.staging.id
}
```

### Custom Workspace Permissions

When the presets do not fit, you can define custom permissions:

```hcl
# Custom permissions for a QA team
resource "tfe_team_access" "qa_access" {
  team_id      = tfe_team.qa.id
  workspace_id = tfe_workspace.staging.id

  permissions {
    runs              = "plan"     # Can only plan, not apply
    variables         = "read"     # Can view but not modify variables
    state_versions    = "read-outputs" # Can read outputs only
    sentinel_mocks    = "read"
    workspace_locking = false      # Cannot lock/unlock
    run_tasks         = false
  }
}
```

The `runs` permission has these options:
- `read` - View runs
- `plan` - Queue plans
- `apply` - Apply runs

The `variables` permission options:
- `none` - No access
- `read` - View variables
- `write` - Create, edit, delete variables

The `state_versions` permission options:
- `none` - No access
- `read` - Read full state
- `read-outputs` - Only read outputs from state
- `write` - Write state versions

## Project-Level Permissions

Projects group workspaces together, and you can assign team access at the project level. This is helpful when you have many workspaces that should share the same access rules:

```hcl
# Create a project
resource "tfe_project" "infrastructure" {
  name         = "core-infrastructure"
  organization = "your-org"
}

# Grant team access at the project level
resource "tfe_team_project_access" "platform_infra" {
  access     = "maintain"
  team_id    = tfe_team.platform.id
  project_id = tfe_project.infrastructure.id
}

# Custom project-level permissions
resource "tfe_team_project_access" "dev_infra" {
  access     = "custom"
  team_id    = tfe_team.developers.id
  project_id = tfe_project.infrastructure.id

  project_access {
    settings = "read"
    teams    = "none"
  }

  workspace_access {
    runs           = "plan"
    variables      = "read"
    state_versions = "read-outputs"
    create         = false
    locking        = false
    delete         = false
    move           = false
  }
}
```

Project-level access presets are:
- **Read**: View project and its workspaces
- **Write**: Manage workspaces within the project
- **Maintain**: Manage workspaces and project settings
- **Admin**: Full control including team access management
- **Custom**: Fine-grained control over individual permissions

## Best Practices for Teams and Permissions

### Follow the Principle of Least Privilege

Start with the minimum permissions needed and add more only when justified:

```hcl
# Start restrictive - developers can plan but not apply to production
resource "tfe_team_access" "dev_production" {
  team_id      = tfe_team.developers.id
  workspace_id = tfe_workspace.production.id

  permissions {
    runs              = "plan"
    variables         = "none"
    state_versions    = "read-outputs"
    sentinel_mocks    = "none"
    workspace_locking = false
    run_tasks         = false
  }
}
```

### Use Projects to Simplify Access Management

Instead of setting permissions on every workspace individually, group workspaces into projects and set access at the project level. This reduces the overhead of managing permissions as your workspace count grows.

### Create Role-Based Teams

Structure your teams around roles rather than specific projects:

```hcl
# Role-based team structure
resource "tfe_team" "infra_admins" {
  name         = "infrastructure-admins"
  organization = "your-org"
  organization_access {
    manage_workspaces = true
    manage_policies   = true
  }
}

resource "tfe_team" "app_developers" {
  name         = "application-developers"
  organization = "your-org"
}

resource "tfe_team" "security_reviewers" {
  name         = "security-reviewers"
  organization = "your-org"
  organization_access {
    manage_policies = true
  }
}

resource "tfe_team" "readonly_auditors" {
  name         = "auditors"
  organization = "your-org"
}
```

### Audit Access Regularly

Use the API to review team memberships and permissions periodically:

```bash
# List all teams in an organization
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/organizations/your-org/teams

# Get team details including members
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/teams/team-xxxxxxxx
```

## Combining with SSO

For organizations using SSO, you can map identity provider groups to HCP Terraform teams. This means team membership is managed through your identity provider rather than manually in HCP Terraform. See our post on [configuring SSO for HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-sso-for-hcp-terraform/view) for details on setting that up.

## Summary

Setting up proper teams and permissions in HCP Terraform is foundational for a secure infrastructure workflow. The key takeaways are: create role-based teams, use project-level permissions to simplify management, follow least privilege, and manage your access control as code using the `tfe` provider. This way, your permission structure is versioned, reviewable, and reproducible.

For more on managing your HCP Terraform organization, check out our guide on [using projects in HCP Terraform for organization](https://oneuptime.com/blog/post/2026-02-23-how-to-use-projects-in-hcp-terraform-for-organization/view).
