# How to Use the GitHub Provider for Repository Management in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub, Repository Management, DevOps, Infrastructure as Code

Description: Learn how to use the Terraform GitHub provider to manage repositories, branch protection rules, team permissions, webhooks, and Actions secrets programmatically.

---

The GitHub provider for Terraform enables you to manage your GitHub organization's repositories, teams, branch protection rules, and settings as code. This is especially valuable for organizations with many repositories where maintaining consistent settings manually would be impractical. With Terraform, you can enforce naming conventions, branch protection policies, and team access patterns across all repositories.

In this guide, we will explore the GitHub provider comprehensively, covering repository creation, team management, branch protection, webhooks, and Actions configuration.

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  owner = var.github_org
  token = var.github_token
}

variable "github_org" {
  type    = string
  default = "my-organization"
}

variable "github_token" {
  type      = string
  sensitive = true
}
```

## Creating Repositories

```hcl
# repositories.tf - Create and configure repositories
resource "github_repository" "microservice" {
  name        = "user-service"
  description = "User management microservice"
  visibility  = "private"

  has_issues      = true
  has_projects    = true
  has_wiki        = false
  has_downloads   = false
  has_discussions  = false

  allow_merge_commit = false
  allow_squash_merge = true
  allow_rebase_merge = true
  allow_auto_merge   = true

  delete_branch_on_merge = true

  vulnerability_alerts = true

  template {
    owner      = var.github_org
    repository = "microservice-template"
  }
}

# Repository from a variable map
variable "repositories" {
  type = map(object({
    description = string
    visibility  = string
    template    = string
    topics      = list(string)
  }))
  default = {
    "api-gateway" = {
      description = "API Gateway service"
      visibility  = "private"
      template    = "microservice-template"
      topics      = ["api", "gateway", "go"]
    }
    "frontend-app" = {
      description = "React frontend application"
      visibility  = "private"
      template    = "frontend-template"
      topics      = ["react", "frontend", "typescript"]
    }
    "shared-libs" = {
      description = "Shared libraries and utilities"
      visibility  = "internal"
      template    = ""
      topics      = ["library", "shared"]
    }
  }
}

resource "github_repository" "repos" {
  for_each = var.repositories

  name        = each.key
  description = each.value.description
  visibility  = each.value.visibility
  topics      = each.value.topics

  has_issues             = true
  has_projects           = true
  allow_squash_merge     = true
  delete_branch_on_merge = true
  vulnerability_alerts   = true

  dynamic "template" {
    for_each = each.value.template != "" ? [each.value.template] : []
    content {
      owner      = var.github_org
      repository = template.value
    }
  }
}
```

## Managing Teams

```hcl
# teams.tf - Create and manage GitHub teams
resource "github_team" "engineering" {
  name        = "engineering"
  description = "Engineering team"
  privacy     = "closed"
}

resource "github_team" "platform" {
  name           = "platform"
  description    = "Platform engineering"
  privacy        = "closed"
  parent_team_id = github_team.engineering.id
}

resource "github_team" "backend" {
  name           = "backend"
  description    = "Backend services team"
  privacy        = "closed"
  parent_team_id = github_team.engineering.id
}

# Team repository access
resource "github_team_repository" "platform_repos" {
  for_each = var.repositories

  team_id    = github_team.platform.id
  repository = github_repository.repos[each.key].name
  permission = "push"
}
```

## Branch Protection Rules

```hcl
# branch-protection.tf - Enforce branch policies
resource "github_branch_protection" "main" {
  for_each = var.repositories

  repository_id = github_repository.repos[each.key].node_id
  pattern        = "main"

  required_pull_request_reviews {
    required_approving_review_count = 2
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
  }

  required_status_checks {
    strict   = true
    contexts = ["ci/build", "ci/test", "ci/lint"]
  }

  enforce_admins    = false
  allows_force_pushes = false
  allows_deletions    = false

  required_linear_history = true
}
```

## Webhooks

```hcl
# webhooks.tf - Configure repository webhooks
resource "github_repository_webhook" "ci" {
  for_each = var.repositories

  repository = github_repository.repos[each.key].name

  configuration {
    url          = var.webhook_url
    content_type = "json"
    secret       = var.webhook_secret
    insecure_ssl = false
  }

  active = true
  events = ["push", "pull_request"]
}

variable "webhook_url" {
  type    = string
  default = "https://ci.example.com/webhook"
}

variable "webhook_secret" {
  type      = string
  sensitive = true
  default   = "placeholder"
}
```

## Actions Secrets

```hcl
# secrets.tf - Manage Actions secrets
resource "github_actions_organization_secret" "docker_password" {
  secret_name     = "DOCKER_PASSWORD"
  visibility      = "all"
  plaintext_value = var.docker_password
}

variable "docker_password" {
  type      = string
  sensitive = true
  default   = "placeholder"
}
```

## Outputs

```hcl
output "repository_urls" {
  value = {
    for k, v in github_repository.repos : k => v.html_url
  }
}

output "team_ids" {
  value = {
    engineering = github_team.engineering.id
    platform    = github_team.platform.id
    backend     = github_team.backend.id
  }
}
```

## Conclusion

The GitHub provider transforms repository management from a manual process into an automated, version-controlled workflow. By defining repositories, teams, branch protection, and secrets in Terraform, you ensure consistency across your organization. For specific deep dives, see our guides on [creating repositories](https://oneuptime.com/blog/post/2026-02-23-how-to-create-github-repositories-with-terraform/view), [branch protection rules](https://oneuptime.com/blog/post/2026-02-23-how-to-create-github-branch-protection-rules-with-terraform/view), and [Actions secrets](https://oneuptime.com/blog/post/2026-02-23-how-to-create-github-actions-secrets-with-terraform/view).
