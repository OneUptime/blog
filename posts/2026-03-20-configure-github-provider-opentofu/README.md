# How to Configure the GitHub Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitHub, Provider Configuration, Infrastructure as Code, GitOps

Description: Learn how to configure the GitHub provider in OpenTofu to manage repositories, teams, branch protection rules, and GitHub Actions secrets as code.

## Introduction

The GitHub provider allows OpenTofu to manage GitHub resources-repositories, teams, branch protection rules, webhooks, and Actions secrets-as infrastructure code. This enables GitOps workflows where your GitHub organisation configuration is versioned and auditable.

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
  # Authenticate via environment variable (recommended):
  # export GITHUB_TOKEN="ghp_your_personal_access_token"
  # Or via GitHub App credentials:
  # app_auth { id = var.app_id; installation_id = var.installation_id; pem_file = var.pem_file }

  owner = var.github_org  # Organisation name or username
}
```

## Authentication Options

### Personal Access Token (PAT)

```bash
# Set the token via environment variable

export GITHUB_TOKEN="ghp_your_token_here"
export TF_VAR_github_org="my-organisation"
```

### GitHub App (Recommended for Production)

```hcl
provider "github" {
  owner = var.github_org

  app_auth {
    id              = var.github_app_id
    installation_id = var.github_app_installation_id
    pem_file        = var.github_app_pem_file
  }
}
```

## Variables

```hcl
variable "github_org" {
  type        = string
  description = "GitHub organisation name"
}
```

## Creating a Repository

```hcl
resource "github_repository" "app" {
  name        = "my-application"
  description = "Main application repository"
  visibility  = "private"

  has_issues    = true
  has_projects  = false
  has_wiki      = false

  topics = ["application", "backend", "api"]

  template {
    owner      = var.github_org
    repository = "service-template"
  }
}

resource "github_repository_vulnerability_alerts" "app" {
  repository = github_repository.app.name
  enabled    = true
}
```

## Conclusion

The GitHub provider turns your organisation's repository configuration into auditable, version-controlled code. Use GitHub Apps rather than PATs for production-Apps have finer-grained permissions and don't depend on an individual user's account.
