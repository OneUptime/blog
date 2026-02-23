# How to Create GitHub Repositories with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub, Repositories, DevOps, Infrastructure as Code

Description: Learn how to create and configure GitHub repositories with Terraform including templates, topics, default branches, collaborators, and organizational standards.

---

Creating GitHub repositories manually through the web interface leads to inconsistent configurations across your organization. Some repositories have branch protection, others do not. Some enable vulnerability alerts, others forget. Terraform solves this by defining repository configurations as code, ensuring every repository follows your organizational standards from the moment it is created.

In this guide, we will cover creating GitHub repositories with Terraform including configuration options, templates, team access, default branches, and patterns for managing repositories at scale.

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
  type = string
}

variable "github_token" {
  type      = string
  sensitive = true
}
```

## Creating a Basic Repository

```hcl
resource "github_repository" "basic" {
  name        = "my-new-service"
  description = "A new microservice for handling user notifications"
  visibility  = "private"

  # Feature toggles
  has_issues    = true
  has_projects  = true
  has_wiki      = false
  has_downloads = false

  # Merge settings
  allow_merge_commit = false  # Disable merge commits for cleaner history
  allow_squash_merge = true   # Squash into single commits
  allow_rebase_merge = true   # Allow rebasing
  allow_auto_merge   = true   # Enable auto-merge when checks pass

  # Cleanup
  delete_branch_on_merge = true

  # Security
  vulnerability_alerts = true

  # Topics for discoverability
  topics = ["microservice", "notifications", "go"]
}
```

## Creating from a Template

```hcl
resource "github_repository" "from_template" {
  name        = "payment-service"
  description = "Payment processing microservice"
  visibility  = "private"

  template {
    owner                = var.github_org
    repository           = "go-microservice-template"
    include_all_branches = false
  }

  has_issues             = true
  allow_squash_merge     = true
  delete_branch_on_merge = true
  vulnerability_alerts   = true
  topics                 = ["payments", "microservice", "go"]
}
```

## Creating Multiple Repositories

```hcl
variable "services" {
  type = map(object({
    description = string
    language    = string
    template    = string
    team        = string
    visibility  = string
  }))
  default = {
    "auth-service" = {
      description = "Authentication and authorization service"
      language    = "go"
      template    = "go-microservice-template"
      team        = "platform"
      visibility  = "private"
    }
    "email-service" = {
      description = "Email delivery service"
      language    = "python"
      template    = "python-service-template"
      team        = "backend"
      visibility  = "private"
    }
    "dashboard-ui" = {
      description = "Admin dashboard frontend"
      language    = "typescript"
      template    = "react-app-template"
      team        = "frontend"
      visibility  = "private"
    }
    "terraform-modules" = {
      description = "Shared Terraform modules"
      language    = "hcl"
      template    = ""
      team        = "platform"
      visibility  = "internal"
    }
  }
}

resource "github_repository" "services" {
  for_each = var.services

  name        = each.key
  description = each.value.description
  visibility  = each.value.visibility

  has_issues             = true
  has_projects           = true
  allow_squash_merge     = true
  allow_rebase_merge     = true
  allow_merge_commit     = false
  delete_branch_on_merge = true
  vulnerability_alerts   = true

  topics = [each.value.language, each.value.team, "managed-by-terraform"]

  dynamic "template" {
    for_each = each.value.template != "" ? [1] : []
    content {
      owner      = var.github_org
      repository = each.value.template
    }
  }

  lifecycle {
    prevent_destroy = true  # Prevent accidental repository deletion
  }
}
```

## Adding Default Branch Configuration

```hcl
resource "github_branch_default" "main" {
  for_each = var.services

  repository = github_repository.services[each.key].name
  branch     = "main"
}
```

## Adding CODEOWNERS File

```hcl
resource "github_repository_file" "codeowners" {
  for_each = var.services

  repository          = github_repository.services[each.key].name
  branch              = "main"
  file                = ".github/CODEOWNERS"
  content             = "* @${var.github_org}/${each.value.team}\n"
  commit_message      = "Add CODEOWNERS file"
  overwrite_on_create = true
}
```

## Adding Collaborators and Teams

```hcl
resource "github_team" "teams" {
  for_each = toset(distinct([for s in var.services : s.team]))

  name    = each.value
  privacy = "closed"
}

resource "github_team_repository" "access" {
  for_each = var.services

  team_id    = github_team.teams[each.value.team].id
  repository = github_repository.services[each.key].name
  permission = "push"
}
```

## Outputs

```hcl
output "repository_urls" {
  value = { for k, v in github_repository.services : k => v.html_url }
}

output "repository_clone_urls" {
  value = { for k, v in github_repository.services : k => v.ssh_clone_url }
}
```

## Conclusion

Creating GitHub repositories with Terraform ensures every repository in your organization starts with the right configuration. Templates provide a consistent starting point, and Terraform's lifecycle rules prevent accidental deletion. For securing these repositories, see our guides on [branch protection rules](https://oneuptime.com/blog/post/2026-02-23-how-to-create-github-branch-protection-rules-with-terraform/view) and [Actions secrets](https://oneuptime.com/blog/post/2026-02-23-how-to-create-github-actions-secrets-with-terraform/view).
