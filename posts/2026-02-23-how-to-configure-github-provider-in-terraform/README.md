# How to Configure GitHub Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub, Providers, DevOps, Git, Infrastructure as Code

Description: Learn how to configure the Terraform GitHub provider to manage repositories, teams, branch protection rules, and organization settings as infrastructure code.

---

Managing GitHub configuration through the web UI works when you have a handful of repositories. Once your organization grows to dozens or hundreds of repos, maintaining consistent settings becomes a chore. The Terraform GitHub provider lets you codify repository creation, team permissions, branch protection rules, and more. Changes go through pull requests, get reviewed, and are applied consistently.

## Authentication

The GitHub provider needs a personal access token (PAT) or a GitHub App installation token. Personal access tokens are simpler to set up. GitHub Apps are better for organizations because they are not tied to an individual user.

### Personal Access Token (Classic)

Create a token at GitHub Settings > Developer settings > Personal access tokens > Tokens (classic):

Required scopes:
- `repo` - Full control of private repositories
- `admin:org` - For managing organization settings and teams
- `delete_repo` - If you want Terraform to delete repos

```bash
# Set the token as an environment variable
export GITHUB_TOKEN="ghp_your_personal_access_token"
```

### Fine-Grained Personal Access Token

Fine-grained tokens let you scope access to specific repositories and permissions:

1. Go to Settings > Developer settings > Personal access tokens > Fine-grained tokens
2. Select the target organization
3. Choose specific repositories or all repositories
4. Set permissions for repository administration, contents, etc.

```bash
export GITHUB_TOKEN="github_pat_your_fine_grained_token"
```

### GitHub App

For production setups, a GitHub App is preferred:

```hcl
provider "github" {
  owner = var.github_organization

  app_auth {
    id              = var.github_app_id
    installation_id = var.github_app_installation_id
    pem_file        = file(var.github_app_pem_file)
  }
}
```

## Basic Provider Configuration

```hcl
# versions.tf
terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

# provider.tf
provider "github" {
  owner = "my-organization"  # GitHub organization name
  # Token read from GITHUB_TOKEN environment variable
}
```

For personal repositories (not organization):

```hcl
provider "github" {
  # When owner is not set, it uses the authenticated user's account
}
```

## Managing Repositories

Create and configure repositories:

```hcl
# Create a new repository
resource "github_repository" "api_service" {
  name        = "api-service"
  description = "Backend API service"
  visibility  = "private"

  # Repository features
  has_issues    = true
  has_projects  = false
  has_wiki      = false
  has_downloads = false

  # Allow merge commit, squash, and rebase
  allow_merge_commit = false
  allow_squash_merge = true
  allow_rebase_merge = true

  # Automatically delete head branches after merge
  delete_branch_on_merge = true

  # Default branch
  auto_init = true

  # Template (optional - create from a template repo)
  # template {
  #   owner      = "my-organization"
  #   repository = "service-template"
  # }

  # Vulnerability alerts
  vulnerability_alerts = true

  # Topics/tags
  topics = ["api", "backend", "golang"]
}
```

### Creating Repositories in Bulk

Use `for_each` for multiple repositories with similar settings:

```hcl
locals {
  repositories = {
    "api-service" = {
      description = "Backend API service"
      visibility  = "private"
      topics      = ["api", "backend"]
    }
    "web-frontend" = {
      description = "Web frontend application"
      visibility  = "private"
      topics      = ["frontend", "react"]
    }
    "shared-lib" = {
      description = "Shared library for internal services"
      visibility  = "internal"
      topics      = ["library", "shared"]
    }
    "docs" = {
      description = "Technical documentation"
      visibility  = "public"
      topics      = ["documentation"]
    }
  }
}

resource "github_repository" "repos" {
  for_each = local.repositories

  name        = each.key
  description = each.value.description
  visibility  = each.value.visibility
  topics      = each.value.topics

  # Standard settings applied to all repos
  has_issues             = true
  has_wiki               = false
  allow_merge_commit     = false
  allow_squash_merge     = true
  delete_branch_on_merge = true
  vulnerability_alerts   = true
  auto_init              = true
}
```

## Branch Protection Rules

Protect important branches from direct pushes and enforce review requirements:

```hcl
resource "github_branch_protection" "main" {
  repository_id = github_repository.api_service.node_id
  pattern       = "main"

  # Require pull request reviews
  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
    required_approving_review_count = 2
  }

  # Require status checks to pass
  required_status_checks {
    strict   = true  # Require branch to be up to date
    contexts = ["ci/build", "ci/test", "ci/lint"]
  }

  # Enforce for admins too
  enforce_admins = true

  # Require signed commits
  require_signed_commits = false

  # Require linear history (no merge commits)
  required_linear_history = true

  # Allow force pushes (generally keep this false)
  allows_force_pushes = false

  # Allow deletions
  allows_deletions = false
}

# Protect release branches with a pattern
resource "github_branch_protection" "release" {
  repository_id = github_repository.api_service.node_id
  pattern       = "release/*"

  required_pull_request_reviews {
    required_approving_review_count = 1
  }

  enforce_admins = true
}
```

## Managing Teams

Organize team structure and permissions:

```hcl
# Create teams
resource "github_team" "engineering" {
  name        = "engineering"
  description = "Engineering department"
  privacy     = "closed"
}

resource "github_team" "backend" {
  name           = "backend"
  description    = "Backend engineering team"
  privacy        = "closed"
  parent_team_id = github_team.engineering.id
}

resource "github_team" "frontend" {
  name           = "frontend"
  description    = "Frontend engineering team"
  privacy        = "closed"
  parent_team_id = github_team.engineering.id
}

resource "github_team" "devops" {
  name        = "devops"
  description = "DevOps and infrastructure team"
  privacy     = "closed"
}

# Add members to teams
resource "github_team_membership" "backend_members" {
  for_each = toset(["developer1", "developer2", "developer3"])

  team_id  = github_team.backend.id
  username = each.value
  role     = "member"
}

resource "github_team_membership" "backend_maintainer" {
  team_id  = github_team.backend.id
  username = "lead-developer"
  role     = "maintainer"
}

# Grant team access to repositories
resource "github_team_repository" "backend_api" {
  team_id    = github_team.backend.id
  repository = github_repository.api_service.name
  permission = "push"  # pull, push, maintain, triage, admin
}

resource "github_team_repository" "devops_api" {
  team_id    = github_team.devops.id
  repository = github_repository.api_service.name
  permission = "admin"
}
```

## Repository Webhooks

Set up webhooks for CI/CD or notification integrations:

```hcl
resource "github_repository_webhook" "ci" {
  repository = github_repository.api_service.name

  configuration {
    url          = "https://ci.example.com/webhooks/github"
    content_type = "json"
    secret       = var.webhook_secret
    insecure_ssl = false
  }

  active = true
  events = ["push", "pull_request"]
}
```

## Actions Secrets and Variables

Manage GitHub Actions secrets:

```hcl
# Repository-level secret
resource "github_actions_secret" "deploy_key" {
  repository      = github_repository.api_service.name
  secret_name     = "DEPLOY_KEY"
  plaintext_value = var.deploy_key
}

# Organization-level secret
resource "github_actions_organization_secret" "docker_token" {
  secret_name     = "DOCKER_REGISTRY_TOKEN"
  plaintext_value = var.docker_registry_token
  visibility      = "selected"

  selected_repository_ids = [
    github_repository.api_service.repo_id,
  ]
}

# Actions variable (not secret - visible in logs)
resource "github_actions_variable" "environment" {
  repository    = github_repository.api_service.name
  variable_name = "DEPLOY_ENVIRONMENT"
  value         = "production"
}
```

## GitHub Actions Environments

Configure deployment environments with protection rules:

```hcl
resource "github_repository_environment" "production" {
  repository  = github_repository.api_service.name
  environment = "production"

  reviewers {
    teams = [github_team.devops.id]
  }

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

resource "github_repository_environment" "staging" {
  repository  = github_repository.api_service.name
  environment = "staging"

  # No reviewers needed for staging
  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}
```

## Importing Existing Resources

If you have existing GitHub resources, import them:

```bash
# Import a repository
terraform import github_repository.api_service api-service

# Import a team
terraform import github_team.backend 12345678

# Import branch protection
terraform import 'github_branch_protection.main' api-service:main
```

## Troubleshooting

### "403 Resource not accessible by personal access token"

Your token does not have the required scopes. Regenerate it with the necessary permissions.

### "404 Not Found"

The resource does not exist, or your token does not have access to the organization. Verify the `owner` field matches your organization name.

### Rate Limiting

GitHub has API rate limits. If you manage many resources, you may hit them:

```bash
# Check your rate limit
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit
```

Terraform will retry on rate limit errors, but large configurations may need to be split into smaller applies.

## Summary

The GitHub provider turns your organization's GitHub configuration into version-controlled infrastructure. Start with repositories and branch protection rules, then expand to teams, webhooks, and Actions secrets. The biggest win is consistency - every new repository gets the same branch protection, the same team access, and the same security settings without anyone needing to remember to click through the UI.
