# How to Create GitHub Branch Protection Rules with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub, Branch Protection, Security, DevOps, Infrastructure as Code

Description: Learn how to create GitHub branch protection rules with Terraform for enforcing code review, status checks, linear history, and preventing force pushes across repositories.

---

Branch protection rules are essential for maintaining code quality and security in your repositories. They enforce code review requirements, require status checks to pass before merging, prevent force pushes to important branches, and ensure a clean commit history. Managing these rules with Terraform guarantees that every repository in your organization has consistent protection.

In this guide, we will create comprehensive branch protection rules with Terraform covering review requirements, status checks, admin enforcement, and patterns for applying rules across multiple repositories.

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

## Basic Branch Protection

```hcl
resource "github_repository" "app" {
  name       = "my-application"
  visibility = "private"
}

resource "github_branch_protection" "main" {
  repository_id = github_repository.app.node_id
  pattern       = "main"

  # Require pull request reviews
  required_pull_request_reviews {
    required_approving_review_count = 2
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
    restrict_dismissals             = true
  }

  # Require status checks
  required_status_checks {
    strict   = true  # Require branch to be up to date before merging
    contexts = ["ci/build", "ci/test", "ci/lint"]
  }

  # Prevent force pushes and branch deletion
  allows_force_pushes = false
  allows_deletions    = false

  # Require linear history (no merge commits)
  required_linear_history = true

  # Apply rules to admins too
  enforce_admins = true

  # Require signed commits
  require_signed_commits = true
}
```

## Protection for Release Branches

```hcl
resource "github_branch_protection" "release" {
  repository_id = github_repository.app.node_id
  pattern       = "release/*"

  required_pull_request_reviews {
    required_approving_review_count = 1
    dismiss_stale_reviews           = true
  }

  required_status_checks {
    strict   = true
    contexts = ["ci/build", "ci/test"]
  }

  allows_force_pushes = false
  allows_deletions    = false
  enforce_admins      = true
}
```

## Protection for Development Branch

```hcl
resource "github_branch_protection" "develop" {
  repository_id = github_repository.app.node_id
  pattern       = "develop"

  required_pull_request_reviews {
    required_approving_review_count = 1
    dismiss_stale_reviews           = false
  }

  required_status_checks {
    strict   = false  # Looser requirements for develop
    contexts = ["ci/build"]
  }

  allows_force_pushes = false
  allows_deletions    = false
}
```

## Applying Protection Across Multiple Repositories

```hcl
variable "protected_repos" {
  type = map(object({
    description     = string
    required_checks = list(string)
    min_reviews     = number
  }))
  default = {
    "api-service" = {
      description     = "API microservice"
      required_checks = ["ci/build", "ci/test", "ci/lint", "security/scan"]
      min_reviews     = 2
    }
    "web-frontend" = {
      description     = "Web frontend"
      required_checks = ["ci/build", "ci/test", "ci/e2e"]
      min_reviews     = 1
    }
    "infrastructure" = {
      description     = "IaC repository"
      required_checks = ["terraform/validate", "terraform/plan"]
      min_reviews     = 2
    }
  }
}

resource "github_repository" "repos" {
  for_each    = var.protected_repos
  name        = each.key
  description = each.value.description
  visibility  = "private"
}

resource "github_branch_protection" "repos_main" {
  for_each = var.protected_repos

  repository_id = github_repository.repos[each.key].node_id
  pattern       = "main"

  required_pull_request_reviews {
    required_approving_review_count = each.value.min_reviews
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
  }

  required_status_checks {
    strict   = true
    contexts = each.value.required_checks
  }

  allows_force_pushes     = false
  allows_deletions        = false
  required_linear_history = true
  enforce_admins          = each.value.min_reviews >= 2
}
```

## Tag Protection

```hcl
resource "github_repository_tag_protection" "release_tags" {
  for_each = var.protected_repos

  repository = github_repository.repos[each.key].name
  pattern    = "v*"
}
```

## Outputs

```hcl
output "protected_branches" {
  value = {
    for k, v in github_branch_protection.repos_main :
    k => {
      pattern     = v.pattern
      min_reviews = var.protected_repos[k].min_reviews
      checks      = var.protected_repos[k].required_checks
    }
  }
}
```

## Conclusion

Branch protection rules managed with Terraform ensure every repository follows your organization's quality and security standards. By defining protection rules as code, you can review changes before they take effect and maintain consistency as your repository count grows. For the complete GitHub management setup, see our guides on [creating repositories](https://oneuptime.com/blog/post/2026-02-23-how-to-create-github-repositories-with-terraform/view) and [Actions secrets](https://oneuptime.com/blog/post/2026-02-23-how-to-create-github-actions-secrets-with-terraform/view).
