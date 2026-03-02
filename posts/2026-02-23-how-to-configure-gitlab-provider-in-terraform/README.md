# How to Configure GitLab Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitLab, Provider, DevOps, Git, Infrastructure as Code

Description: Learn how to configure the Terraform GitLab provider to manage projects, groups, CI/CD variables, merge request approvals, and other GitLab resources as code.

---

GitLab is a complete DevOps platform, and with dozens of settings per project, keeping things consistent across many projects becomes difficult. The Terraform GitLab provider lets you manage projects, groups, CI/CD pipelines, merge request settings, and user permissions programmatically. This post walks through the configuration and shows practical patterns for common GitLab management tasks.

## Authentication

The GitLab provider supports personal access tokens, group tokens, and project tokens. Personal access tokens are the most common for Terraform.

### Creating a Personal Access Token

1. Go to your GitLab profile > Preferences > Access Tokens
2. Give it a descriptive name like "terraform-automation"
3. Set an expiration date
4. Select the required scopes:
   - `api` - Full API access (most operations need this)
   - `read_api` - Read-only API access (sufficient for data sources)

```bash
# Set the token as an environment variable
export GITLAB_TOKEN="glpat-your-token-here"
```

### Group Access Token

For managing resources within a specific group, a group access token is more appropriate than a personal token:

```bash
# Created via GitLab UI: Group > Settings > Access Tokens
export GITLAB_TOKEN="glpat-group-token-here"
```

## Basic Provider Configuration

```hcl
# versions.tf
terraform {
  required_providers {
    gitlab = {
      source  = "gitlabhq/gitlab"
      version = "~> 17.0"
    }
  }
}

# provider.tf
provider "gitlab" {
  # Reads from GITLAB_TOKEN environment variable
  # Defaults to gitlab.com
}
```

### Self-Managed GitLab

For self-hosted GitLab instances:

```hcl
provider "gitlab" {
  base_url = "https://gitlab.mycompany.com/api/v4"
  # Token from GITLAB_TOKEN environment variable
}
```

Or with explicit token:

```hcl
provider "gitlab" {
  base_url = var.gitlab_url
  token    = var.gitlab_token
}

variable "gitlab_url" {
  description = "GitLab instance URL"
  type        = string
  default     = "https://gitlab.com/api/v4"
}

variable "gitlab_token" {
  description = "GitLab API token"
  type        = string
  sensitive   = true
}
```

## Managing Groups

Groups in GitLab organize projects and manage access:

```hcl
# Top-level group
resource "gitlab_group" "engineering" {
  name        = "engineering"
  path        = "engineering"
  description = "Engineering department"

  # Visibility: private, internal, public
  visibility_level = "private"

  # Project creation level: noone, maintainer, developer
  project_creation_level = "maintainer"

  # Require two-factor authentication
  require_two_factor_authentication = true
}

# Subgroup
resource "gitlab_group" "backend" {
  name      = "backend"
  path      = "backend"
  parent_id = gitlab_group.engineering.id

  visibility_level = "private"
}

resource "gitlab_group" "frontend" {
  name      = "frontend"
  path      = "frontend"
  parent_id = gitlab_group.engineering.id

  visibility_level = "private"
}
```

## Managing Projects

Create and configure GitLab projects:

```hcl
# Create a project in a group
resource "gitlab_project" "api_service" {
  name         = "api-service"
  description  = "Backend API service"
  namespace_id = gitlab_group.backend.id

  # Visibility
  visibility_level = "private"

  # Features
  issues_enabled           = true
  merge_requests_enabled   = true
  wiki_enabled             = false
  snippets_enabled         = false
  container_registry_enabled = true
  packages_enabled          = true

  # Default branch
  default_branch = "main"
  initialize_with_readme = true

  # Merge request settings
  only_allow_merge_if_pipeline_succeeds      = true
  only_allow_merge_if_all_discussions_are_resolved = true
  merge_method                                = "ff"  # ff, rebase_merge, merge
  squash_option                               = "default_on"

  # Remove source branch after merge
  remove_source_branch_after_merge = true
}
```

### Bulk Project Creation

```hcl
locals {
  projects = {
    "api-service" = {
      description = "Backend API service"
      group       = gitlab_group.backend.id
      topics      = ["api", "golang"]
    }
    "web-app" = {
      description = "Frontend web application"
      group       = gitlab_group.frontend.id
      topics      = ["frontend", "react"]
    }
    "shared-utils" = {
      description = "Shared utility library"
      group       = gitlab_group.engineering.id
      topics      = ["library", "shared"]
    }
  }
}

resource "gitlab_project" "projects" {
  for_each = local.projects

  name         = each.key
  description  = each.value.description
  namespace_id = each.value.group
  topics       = each.value.topics

  visibility_level                  = "private"
  issues_enabled                    = true
  merge_requests_enabled            = true
  wiki_enabled                      = false
  only_allow_merge_if_pipeline_succeeds = true
  remove_source_branch_after_merge  = true
  merge_method                      = "ff"
  squash_option                     = "default_on"
  initialize_with_readme            = true
}
```

## Branch Protection

Protect important branches:

```hcl
resource "gitlab_branch_protection" "main" {
  project            = gitlab_project.api_service.id
  branch             = "main"

  # Push access level: no one, developer, maintainer, admin
  push_access_level  = "no one"

  # Merge access level
  merge_access_level = "maintainer"

  # Allow force push
  allow_force_push = false

  # Require code owner approval
  code_owner_approval_required = true
}

# Protect release branches with a wildcard
resource "gitlab_branch_protection" "release" {
  project            = gitlab_project.api_service.id
  branch             = "release/*"
  push_access_level  = "no one"
  merge_access_level = "maintainer"
}
```

## Merge Request Approval Rules

Configure approval requirements for merge requests:

```hcl
# Project-level approval settings
resource "gitlab_project_level_mr_approvals" "api_service" {
  project                                    = gitlab_project.api_service.id
  reset_approvals_on_push                    = true
  disable_overriding_approvers_per_merge_request = true
}

# Approval rule requiring two approvers
resource "gitlab_project_approval_rule" "default" {
  project            = gitlab_project.api_service.id
  name               = "default"
  approvals_required = 2
  group_ids          = [gitlab_group.backend.id]
}

# Approval rule for security-sensitive paths
resource "gitlab_project_approval_rule" "security" {
  project            = gitlab_project.api_service.id
  name               = "security-review"
  approvals_required = 1
  group_ids          = [gitlab_group.security.id]
}
```

## CI/CD Variables

Manage CI/CD variables at the project and group levels:

```hcl
# Project-level CI/CD variable
resource "gitlab_project_variable" "deploy_key" {
  project   = gitlab_project.api_service.id
  key       = "DEPLOY_KEY"
  value     = var.deploy_key
  protected = true   # Only available in protected branches
  masked    = true   # Masked in CI logs
}

resource "gitlab_project_variable" "docker_registry" {
  project   = gitlab_project.api_service.id
  key       = "DOCKER_REGISTRY_URL"
  value     = "registry.example.com"
  protected = false
  masked    = false
}

# Environment-scoped variable
resource "gitlab_project_variable" "production_db" {
  project           = gitlab_project.api_service.id
  key               = "DATABASE_URL"
  value             = var.production_database_url
  protected         = true
  masked            = true
  environment_scope = "production"
}

# Group-level variable (inherited by all projects in the group)
resource "gitlab_group_variable" "npm_token" {
  group     = gitlab_group.engineering.id
  key       = "NPM_TOKEN"
  value     = var.npm_token
  protected = true
  masked    = true
}
```

## Deploy Tokens and Keys

Set up deployment authentication:

```hcl
# Deploy token for pulling container images
resource "gitlab_deploy_token" "registry_read" {
  project  = gitlab_project.api_service.id
  name     = "registry-read-token"
  username = "registry-reader"

  scopes = ["read_registry"]

  # Optional expiry
  expires_at = "2027-01-01T00:00:00Z"
}

# Deploy key for read-only Git access
resource "gitlab_deploy_key" "deploy" {
  project  = gitlab_project.api_service.id
  title    = "Production deploy key"
  key      = var.deploy_public_key
  can_push = false
}

# Share a deploy key across projects
resource "gitlab_deploy_key" "shared" {
  for_each = {
    "api-service" = gitlab_project.api_service.id
    "web-app"     = gitlab_project.projects["web-app"].id
  }

  project  = each.value
  title    = "Shared CI deploy key"
  key      = var.shared_deploy_public_key
  can_push = false
}
```

## Group and Project Membership

Manage user access:

```hcl
# Look up a user
data "gitlab_user" "developer" {
  username = "john.smith"
}

# Add user to a group
resource "gitlab_group_membership" "developer" {
  group_id     = gitlab_group.backend.id
  user_id      = data.gitlab_user.developer.id
  access_level = "developer"  # guest, reporter, developer, maintainer, owner
}

# Add user to a specific project with different access than the group
resource "gitlab_project_membership" "maintainer" {
  project      = gitlab_project.api_service.id
  user_id      = data.gitlab_user.developer.id
  access_level = "maintainer"
}
```

## Project Hooks (Webhooks)

Set up webhooks for integration:

```hcl
resource "gitlab_project_hook" "ci_webhook" {
  project                 = gitlab_project.api_service.id
  url                     = "https://ci.example.com/webhooks/gitlab"
  token                   = var.webhook_secret
  push_events             = true
  merge_requests_events   = true
  tag_push_events         = true
  pipeline_events         = true
  enable_ssl_verification = true
}
```

## Managing Multiple GitLab Instances

If you work with both GitLab.com and a self-managed instance:

```hcl
# GitLab.com (SaaS)
provider "gitlab" {
  base_url = "https://gitlab.com/api/v4"
  token    = var.gitlab_com_token
}

# Self-managed GitLab
provider "gitlab" {
  alias    = "self_managed"
  base_url = "https://gitlab.internal.company.com/api/v4"
  token    = var.gitlab_internal_token
}

# Project on GitLab.com
resource "gitlab_project" "open_source" {
  name             = "our-open-source-lib"
  visibility_level = "public"
}

# Project on self-managed instance
resource "gitlab_project" "internal" {
  provider = gitlab.self_managed

  name             = "internal-service"
  visibility_level = "private"
  namespace_id     = var.internal_group_id
}
```

## Troubleshooting

### "403 Forbidden"

Your token lacks the required scope. Make sure it has `api` scope for write operations.

### "404 Not Found"

Either the resource does not exist or your token does not have access. Verify the project path and group membership.

### Rate Limiting on GitLab.com

GitLab.com has API rate limits. For large Terraform configurations, you may need to add `parallelism` limits:

```bash
terraform apply -parallelism=5
```

## Summary

The GitLab provider turns your GitLab administration into versioned, reviewable code. Start with groups and projects, add branch protection and approval rules for governance, and manage CI/CD variables for your pipelines. The combination of consistent project settings, enforced merge request policies, and automated CI/CD variable management removes a huge amount of manual work and ensures every project in your organization follows the same standards.
