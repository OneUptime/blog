# How to Configure the GitHub Provider in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitHub, Infrastructure as Code, IaC, GitHub Provider

Description: Learn how to configure the GitHub provider in OpenTofu with authentication and organization settings.

## Introduction

This guide covers how to configure the GitHub provider in OpenTofu with practical examples for authentication, organization settings, and repository management.

## Prerequisites

- OpenTofu v1.6+
- A GitHub personal access token in `GITHUB_TOKEN`, GitHub CLI authentication, or GitHub App credentials
- Access to the target GitHub organization or user account
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
export GITHUB_TOKEN="your-github-token"

# Optional for GitHub Enterprise Server
# export GITHUB_BASE_URL="https://ghe.example.com/api/v3/"
```

```hcl
variable "github_owner" {
  description = "GitHub organization or user account to manage"
  type        = string
}

variable "repository_name" {
  description = "Name of the GitHub repository to create"
  type        = string
}

variable "team_name" {
  description = "GitHub team to grant access to the repository"
  type        = string
  default     = "developers"
}
```

## Step 3: Create Basic Resources

```hcl
resource "github_repository" "main" {
  name        = var.repository_name
  description = "Managed by OpenTofu"
  visibility  = "private"
  auto_init   = true

  has_issues             = true
  has_wiki               = false
  allow_squash_merge     = true
  allow_merge_commit     = false
  delete_branch_on_merge = true
}

resource "github_team" "developers" {
  name        = var.team_name
  description = "Managed by OpenTofu"
  privacy     = "closed"
}

resource "github_team_repository" "developers_access" {
  team_id    = github_team.developers.id
  repository = github_repository.main.name
  permission = "push"
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "github_branch_default" "default_branch" {
  repository = github_repository.main.name
  branch     = "development"
  rename     = true
}

resource "github_actions_variable" "environment" {
  repository    = github_repository.main.name
  variable_name = "ENVIRONMENT"
  value         = "production"
}
```

## Step 5: Define Outputs

```hcl
output "repository_id" {
  description = "The GitHub ID of the created repository"
  value       = github_repository.main.repo_id
}

output "repository_name" {
  description = "The name of the created repository"
  value       = github_repository.main.name
}

output "repository_url" {
  description = "The URL of the created repository"
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
Verify `GITHUB_TOKEN` is set and that it has access to the target owner. If you authenticate with GitHub App environment variables, set `owner` and include an empty `app_auth {}` block in the provider configuration.

### Rate Limiting
Tune provider settings such as `write_delay_ms`, `read_delay_ms`, `retry_delay_ms`, and `max_retries` if you hit GitHub API rate limits.

### Provider Version Conflicts
Pin the provider in `required_providers` and keep the dependency lock file under version control to ensure reproducible deployments.

## Conclusion

You have successfully configured the GitHub provider in OpenTofu. This provider enables you to manage repositories, teams, permissions, and repository settings as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials.
