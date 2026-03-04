# How to Use Projects in HCP Terraform for Organization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Projects, Organizations, Workspace Management, DevOps

Description: Learn how to use projects in HCP Terraform to group workspaces, manage permissions, and organize infrastructure at scale.

---

When your HCP Terraform organization has dozens or hundreds of workspaces, a flat list quickly becomes unmanageable. Projects provide a folder-like hierarchy that lets you group related workspaces together, assign permissions at the group level, and keep things organized as your infrastructure estate grows.

This guide covers how to create and use projects, assign workspaces to them, manage team access at the project level, and follow organizational patterns that scale.

## What Are Projects?

Projects in HCP Terraform are organizational containers for workspaces. Think of them as folders:

```text
Organization: acme-corp
  Project: Core Infrastructure
    Workspace: networking-production
    Workspace: networking-staging
    Workspace: dns-management

  Project: Application Platform
    Workspace: app-api-production
    Workspace: app-api-staging
    Workspace: app-worker-production

  Project: Data Services
    Workspace: rds-production
    Workspace: redis-production
    Workspace: elasticsearch-production

  Project: Default Project
    Workspace: (everything not assigned to a project)
```

Every workspace belongs to exactly one project. New workspaces go to the "Default Project" unless you specify otherwise.

## Creating Projects

### Through the UI

1. In your HCP Terraform organization, click **Projects** in the sidebar
2. Click **New Project**
3. Enter a name and optional description
4. Click **Create**

### Using the TFE Provider

```hcl
# Create projects for different parts of your infrastructure
resource "tfe_project" "core_infra" {
  name         = "Core Infrastructure"
  organization = "your-org"
  description  = "VPCs, networking, DNS, and shared infrastructure"
}

resource "tfe_project" "app_platform" {
  name         = "Application Platform"
  organization = "your-org"
  description  = "Application services and their infrastructure"
}

resource "tfe_project" "data_services" {
  name         = "Data Services"
  organization = "your-org"
  description  = "Databases, caches, and data pipelines"
}

resource "tfe_project" "security" {
  name         = "Security & Compliance"
  organization = "your-org"
  description  = "IAM, security groups, WAF, and compliance resources"
}
```

### Through the API

```bash
# Create a project via the API
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "projects",
      "attributes": {
        "name": "Core Infrastructure",
        "description": "VPCs, networking, DNS, and shared infrastructure"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/projects"
```

## Assigning Workspaces to Projects

### When Creating a Workspace

```hcl
# Create a workspace inside a specific project
resource "tfe_workspace" "networking_prod" {
  name           = "networking-production"
  organization   = "your-org"
  project_id     = tfe_project.core_infra.id
  execution_mode = "remote"

  tag_names = ["production", "networking", "aws"]
}
```

### Moving Existing Workspaces

```bash
# Move a workspace to a different project via API
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"
PROJECT_ID="prj-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"name\": \"networking-production\"
      },
      \"relationships\": {
        \"project\": {
          \"data\": {
            \"type\": \"projects\",
            \"id\": \"${PROJECT_ID}\"
          }
        }
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}"
```

### Bulk Moving Workspaces

```bash
#!/bin/bash
# bulk-move-workspaces.sh - Move workspaces matching a tag to a project

TAG="$1"
PROJECT_ID="$2"

# Get all workspaces with the tag
WORKSPACES=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces?search[tags]=${TAG}&page[size]=100" \
  | jq -r '.data[] | .id + ":" + .attributes.name')

for WS in $WORKSPACES; do
  WS_ID=$(echo "$WS" | cut -d: -f1)
  WS_NAME=$(echo "$WS" | cut -d: -f2)

  echo "Moving workspace ${WS_NAME} to project..."

  curl -s \
    --header "Authorization: Bearer $TFC_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request PATCH \
    --data "{
      \"data\": {
        \"type\": \"workspaces\",
        \"attributes\": { \"name\": \"${WS_NAME}\" },
        \"relationships\": {
          \"project\": {
            \"data\": { \"type\": \"projects\", \"id\": \"${PROJECT_ID}\" }
          }
        }
      }
    }" \
    "https://app.terraform.io/api/v2/workspaces/${WS_ID}" > /dev/null
done

echo "Done."
```

## Managing Team Access at the Project Level

One of the biggest advantages of projects is managing permissions for groups of workspaces at once instead of individually.

### Preset Access Levels

```hcl
# Platform team gets full access to core infrastructure
resource "tfe_team_project_access" "platform_core_infra" {
  access     = "admin"
  team_id    = tfe_team.platform.id
  project_id = tfe_project.core_infra.id
}

# Developers get read access to core infrastructure
resource "tfe_team_project_access" "dev_core_infra" {
  access     = "read"
  team_id    = tfe_team.developers.id
  project_id = tfe_project.core_infra.id
}

# Backend team gets write access to application platform
resource "tfe_team_project_access" "backend_app_platform" {
  access     = "write"
  team_id    = tfe_team.backend.id
  project_id = tfe_project.app_platform.id
}
```

### Custom Access Levels

For fine-grained control:

```hcl
# DBA team gets custom access to data services
resource "tfe_team_project_access" "dba_data_services" {
  access     = "custom"
  team_id    = tfe_team.dba.id
  project_id = tfe_project.data_services.id

  project_access {
    settings = "read"      # Can view project settings
    teams    = "none"      # Cannot manage team access
  }

  workspace_access {
    runs           = "apply"        # Can plan and apply
    variables      = "write"        # Can manage variables
    state_versions = "read"         # Can read full state
    create         = false          # Cannot create new workspaces
    locking        = true           # Can lock/unlock workspaces
    delete         = false          # Cannot delete workspaces
    move           = false          # Cannot move workspaces
    run_tasks      = false          # Cannot manage run tasks
  }
}
```

### Via the API

```bash
# Assign team access to a project
TEAM_ID="team-xxxxxxxxxxxxxxxx"
PROJECT_ID="prj-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data "{
    \"data\": {
      \"type\": \"team-projects\",
      \"attributes\": {
        \"access\": \"write\"
      },
      \"relationships\": {
        \"team\": {
          \"data\": { \"type\": \"teams\", \"id\": \"${TEAM_ID}\" }
        },
        \"project\": {
          \"data\": { \"type\": \"projects\", \"id\": \"${PROJECT_ID}\" }
        }
      }
    }
  }" \
  "https://app.terraform.io/api/v2/team-projects"
```

## Project Organization Patterns

### Pattern 1: By Domain

Organize around business domains or services:

```text
Project: Payments
  - payments-api-production
  - payments-api-staging
  - payments-database-production
  - payments-worker-production

Project: User Management
  - auth-service-production
  - user-database-production
  - identity-provider

Project: Analytics
  - data-warehouse
  - etl-pipelines
  - reporting-dashboard
```

### Pattern 2: By Environment

Separate projects per environment:

```text
Project: Production
  - networking-production
  - app-production
  - database-production

Project: Staging
  - networking-staging
  - app-staging
  - database-staging

Project: Development
  - networking-dev
  - app-dev
  - database-dev
```

### Pattern 3: By Team

Each team owns a project:

```text
Project: Platform Engineering
  - shared-vpc
  - kubernetes-cluster
  - monitoring-stack
  - ci-cd-infrastructure

Project: Backend Team
  - api-gateway
  - user-service
  - order-service

Project: Data Team
  - data-lake
  - spark-cluster
  - airflow
```

### Pattern 4: Hybrid (Recommended)

Combine approaches for larger organizations:

```text
Project: Platform - Shared Infrastructure
Project: Platform - Kubernetes
Project: Backend - Production
Project: Backend - Non-Production
Project: Data - Production
Project: Data - Non-Production
Project: Security - All Environments
```

## Variable Sets Scoped to Projects

Apply shared variables to all workspaces in a project:

```hcl
# Variable set with shared AWS credentials
resource "tfe_variable_set" "production_aws" {
  name         = "Production AWS Credentials"
  organization = "your-org"
}

resource "tfe_variable" "aws_key" {
  key             = "AWS_ACCESS_KEY_ID"
  value           = var.prod_aws_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.production_aws.id
}

# Scope the variable set to specific projects
resource "tfe_project_variable_set" "core_infra_creds" {
  variable_set_id = tfe_variable_set.production_aws.id
  project_id      = tfe_project.core_infra.id
}

resource "tfe_project_variable_set" "app_platform_creds" {
  variable_set_id = tfe_variable_set.production_aws.id
  project_id      = tfe_project.app_platform.id
}
```

## Listing and Querying Projects

```bash
# List all projects in an organization
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/projects" \
  | jq '.data[] | {id: .id, name: .attributes.name}'

# Get workspaces in a specific project
PROJECT_ID="prj-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/projects/${PROJECT_ID}/workspaces" \
  | jq '.data[] | {name: .attributes.name, status: .attributes["current-run"]}'
```

## Projects vs. Tags

Projects and tags serve complementary purposes:

| Feature | Projects | Tags |
|---|---|---|
| Hierarchy | Yes (each workspace in one project) | No (multiple tags per workspace) |
| Permissions | Yes (team access at project level) | No |
| Filtering | Yes | Yes |
| Variable sets | Yes (scoped to project) | Yes (via workspace variable sets) |
| API querying | Yes | Yes |

Use projects for organizational structure and access control. Use tags for cross-cutting concerns like filtering and categorization.

## Summary

Projects bring hierarchical organization to HCP Terraform. The biggest win is simplified permission management - instead of setting team access on every workspace, set it once at the project level. Decide on an organizational pattern early (by domain, team, or environment), create your projects, move existing workspaces into them, and assign team access. Projects and tags together give you a flexible system that scales with your organization.

For more on organizational strategies, see our guide on [workspace tags](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspace-tags-for-organization-in-hcp-terraform/view) and [teams and permissions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-teams-and-permissions-in-hcp-terraform/view).
