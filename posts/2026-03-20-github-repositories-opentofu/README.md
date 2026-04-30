# How to Create GitHub Repositories with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitHub, Infrastructure as Code, IaC, Repositories, Git

Description: Learn how to create and configure GitHub repositories with branch protection and team access using OpenTofu.

## Introduction

This guide covers how to create GitHub repositories with OpenTofu using the GitHub provider, including branch protection and team access.

## Prerequisites

- OpenTofu v1.6+
- A GitHub organization
- A GitHub personal access token with permission to manage repositories and teams
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  owner = var.github_owner
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export GITHUB_TOKEN="ghp_your_token"
export TF_VAR_github_owner="your-organization"
export TF_VAR_repository_name="platform-infra"
export TF_VAR_team_name="developers"
```

```hcl
variable "github_owner" {
  description = "GitHub organization to manage"
  type        = string
}

variable "repository_name" {
  description = "Name of the GitHub repository"
  type        = string
}

variable "team_name" {
  description = "GitHub team that should get access to the repository"
  type        = string
}
```

## Step 3: Create Basic Resources

```hcl
resource "github_repository" "main" {
  name        = var.repository_name
  description = "Managed by OpenTofu"

  visibility             = "private"
  auto_init              = true
  delete_branch_on_merge = true
  allow_merge_commit     = false
  allow_rebase_merge     = false
  allow_squash_merge     = true
}

resource "github_team" "developers" {
  name        = var.team_name
  description = "Repository maintainers"
  privacy     = "closed"
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "github_branch_default" "main" {
  repository = github_repository.main.name
  branch     = "main"
  rename     = true
}

resource "github_branch_protection" "main" {
  repository_id = github_repository.main.node_id
  pattern       = github_branch_default.main.branch

  enforce_admins                  = true
  required_linear_history         = true
  require_conversation_resolution = true

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    required_approving_review_count = 1
  }
}

resource "github_team_repository" "developers" {
  team_id    = github_team.developers.id
  repository = github_repository.main.name
  permission = "push"
}
```

## Step 5: Define Outputs

```hcl
output "repository_name" {
  description = "The name of the created repository"
  value       = github_repository.main.name
}

output "repository_url" {
  description = "The HTML URL of the created repository"
  value       = github_repository.main.html_url
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify `GITHUB_TOKEN` is set and has permission to manage repositories. If you are assigning team access, the token also needs organization access.

### Rate Limiting
If you hit GitHub API limits, tune the provider's `write_delay_ms`, `read_delay_ms`, `retry_delay_ms`, or `max_retries` settings instead of relying on `depends_on` to serialize resources.

### Provider Version Conflicts
Pin the `integrations/github` provider version and declare it in every module that manages GitHub resources.

## Conclusion

You have successfully configured GitHub repositories with OpenTofu. This provider enables you to manage repositories, branch protection, and team permissions as code, ensuring consistency and enabling GitOps workflows.
