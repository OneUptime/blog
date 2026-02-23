# How to Create GitHub Actions Secrets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub Actions, Secrets, CI/CD, DevOps, Infrastructure as Code

Description: Learn how to manage GitHub Actions secrets with Terraform at repository, environment, and organization levels for secure CI/CD pipeline configuration.

---

GitHub Actions secrets store sensitive values like API keys, passwords, and tokens that your CI/CD workflows need. Managing these secrets through the GitHub web interface is tedious and error-prone, especially across dozens or hundreds of repositories. Terraform lets you define and deploy Actions secrets programmatically, ensuring every repository has the secrets it needs for its CI/CD pipelines.

In this guide, we will cover creating GitHub Actions secrets with Terraform at the repository, environment, and organization levels, along with patterns for managing secrets at scale.

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

## Repository-Level Secrets

```hcl
# repo-secrets.tf - Secrets for a specific repository
resource "github_repository" "app" {
  name       = "my-application"
  visibility = "private"
}

resource "github_actions_secret" "docker_username" {
  repository      = github_repository.app.name
  secret_name     = "DOCKER_USERNAME"
  plaintext_value = var.docker_username
}

resource "github_actions_secret" "docker_password" {
  repository      = github_repository.app.name
  secret_name     = "DOCKER_PASSWORD"
  plaintext_value = var.docker_password
}

resource "github_actions_secret" "aws_access_key" {
  repository      = github_repository.app.name
  secret_name     = "AWS_ACCESS_KEY_ID"
  plaintext_value = var.aws_access_key_id
}

resource "github_actions_secret" "aws_secret_key" {
  repository      = github_repository.app.name
  secret_name     = "AWS_SECRET_ACCESS_KEY"
  plaintext_value = var.aws_secret_access_key
}

variable "docker_username" {
  type      = string
  sensitive = true
}

variable "docker_password" {
  type      = string
  sensitive = true
}

variable "aws_access_key_id" {
  type      = string
  sensitive = true
}

variable "aws_secret_access_key" {
  type      = string
  sensitive = true
}
```

## Organization-Level Secrets

```hcl
# org-secrets.tf - Secrets shared across the organization
resource "github_actions_organization_secret" "npm_token" {
  secret_name     = "NPM_TOKEN"
  visibility      = "all"
  plaintext_value = var.npm_token
}

resource "github_actions_organization_secret" "sonar_token" {
  secret_name     = "SONAR_TOKEN"
  visibility      = "private"  # Only private repos
  plaintext_value = var.sonar_token
}

# Secret visible to specific repositories only
resource "github_actions_organization_secret" "deploy_key" {
  secret_name             = "DEPLOY_KEY"
  visibility              = "selected"
  selected_repository_ids = [
    github_repository.app.repo_id,
  ]
  plaintext_value = var.deploy_key
}

variable "npm_token" {
  type      = string
  sensitive = true
}

variable "sonar_token" {
  type      = string
  sensitive = true
}

variable "deploy_key" {
  type      = string
  sensitive = true
}
```

## Environment-Level Secrets

```hcl
# env-secrets.tf - Secrets scoped to deployment environments
resource "github_repository_environment" "production" {
  repository  = github_repository.app.name
  environment = "production"

  reviewers {
    teams = [var.platform_team_id]
  }

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

variable "platform_team_id" {
  type    = number
  default = 1
}

resource "github_repository_environment" "staging" {
  repository  = github_repository.app.name
  environment = "staging"
}

resource "github_actions_environment_secret" "prod_db_url" {
  repository      = github_repository.app.name
  environment     = github_repository_environment.production.environment
  secret_name     = "DATABASE_URL"
  plaintext_value = var.prod_database_url
}

resource "github_actions_environment_secret" "staging_db_url" {
  repository      = github_repository.app.name
  environment     = github_repository_environment.staging.environment
  secret_name     = "DATABASE_URL"
  plaintext_value = var.staging_database_url
}

variable "prod_database_url" {
  type      = string
  sensitive = true
  default   = "postgres://user:pass@prod-db:5432/app"
}

variable "staging_database_url" {
  type      = string
  sensitive = true
  default   = "postgres://user:pass@staging-db:5432/app"
}
```

## Secrets for Multiple Repositories

```hcl
# multi-repo-secrets.tf - Deploy secrets across multiple repos
variable "repos_needing_docker" {
  type    = list(string)
  default = ["api-service", "web-frontend", "worker-service"]
}

resource "github_repository" "multi" {
  for_each   = toset(var.repos_needing_docker)
  name       = each.value
  visibility = "private"
}

resource "github_actions_secret" "docker_creds" {
  for_each = toset(var.repos_needing_docker)

  repository      = github_repository.multi[each.key].name
  secret_name     = "DOCKER_PASSWORD"
  plaintext_value = var.docker_password
}
```

## Actions Variables (Non-Secret)

```hcl
# variables.tf - Non-sensitive configuration
resource "github_actions_variable" "environment" {
  repository    = github_repository.app.name
  variable_name = "DEPLOY_ENVIRONMENT"
  value         = "production"
}

resource "github_actions_variable" "region" {
  repository    = github_repository.app.name
  variable_name = "AWS_REGION"
  value         = "us-east-1"
}
```

## Outputs

```hcl
output "secrets_configured" {
  description = "List of configured secrets per repository"
  value = {
    (github_repository.app.name) = [
      "DOCKER_USERNAME",
      "DOCKER_PASSWORD",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY"
    ]
  }
}
```

## Conclusion

Managing GitHub Actions secrets with Terraform eliminates the manual process of configuring secrets through the web interface. By defining secrets at the organization, repository, and environment levels, you ensure every CI/CD pipeline has the credentials it needs. Remember that secret values are stored in Terraform state, so encrypt your state file and restrict access. For the complete GitHub management setup, see our guides on [repositories](https://oneuptime.com/blog/post/2026-02-23-how-to-create-github-repositories-with-terraform/view) and [branch protection](https://oneuptime.com/blog/post/2026-02-23-how-to-create-github-branch-protection-rules-with-terraform/view).
