# How to Github Organization Settings with OpenTofu on GitHub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitHub, Infrastructure as Code, GitOps, Automation

Description: Learn how to manage GitHub organization settings with OpenTofu for consistent, version-controlled GitHub organisation management.

## Introduction

The GitHub provider enables managing GitHub organization and repository resources as code once it is authenticated with a token, GitHub CLI, or a GitHub App installation. This guide covers production-ready examples for branch protection, teams, Actions secrets, and repository webhooks.

## Provider Setup

```hcl
terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  owner = var.github_org
}
```

Resource Configuration

```hcl
# Branch protection example

resource "github_branch_protection" "main" {
  repository_id = var.repository_id
  pattern       = "main"

  required_pull_request_reviews {
    required_approving_review_count = 2
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
  }

  required_status_checks {
    strict   = true
    contexts = ["ci/tests", "ci/lint"]
  }

  enforce_admins                  = true
  require_conversation_resolution = true
  allows_deletions                = false
  allows_force_pushes             = false
}

# Team management
resource "github_team" "platform" {
  name        = "platform-team"
  description = "Platform engineering team"
  privacy     = "closed"
}

resource "github_team_membership" "platform" {
  for_each = toset(var.team_members)
  team_id  = github_team.platform.id
  username = each.value
  role     = "member"
}

# Actions secret
resource "github_actions_secret" "deploy_key" {
  repository      = var.repository_name
  secret_name     = "DEPLOY_KEY"
  value           = var.deploy_key_value
}

# Webhook
resource "github_repository_webhook" "ci" {
  repository = var.repository_name

  configuration {
    url          = var.webhook_url
    content_type = "json"
    insecure_ssl = false
    secret       = var.webhook_secret
  }

  active = true
  events = ["push", "pull_request"]
}
```

## Variables

```hcl
variable "github_org"      { type = string }
variable "repository_id"   { type = string }
variable "repository_name" { type = string }
variable "team_members" {
  type    = list(string)
  default = []
}
variable "deploy_key_value" {
  type      = string
  sensitive = true
}
variable "webhook_url"     { type = string }
variable "webhook_secret" {
  type      = string
  sensitive = true
}
```

## Conclusion

GitHub organization and repository resources managed with OpenTofu give your organisation a consistent, auditable configuration baseline. Apply branch protection to all production branches, use teams for CODEOWNERS assignments, and store secrets via the Actions secrets API rather than in repository settings UI.
