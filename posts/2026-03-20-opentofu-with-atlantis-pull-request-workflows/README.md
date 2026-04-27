# How to Use OpenTofu with Atlantis Pull Request Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Atlantis, Pull Requests, GitOps, CI/CD, Workflow

Description: Learn how to configure Atlantis to run OpenTofu plan and apply operations automatically on pull requests, enabling GitOps workflows for infrastructure changes.

## Introduction

Atlantis integrates with GitHub, GitLab, and Bitbucket to run `tofu plan` when PRs are opened and `tofu apply` when PRs are approved and merged. This creates a GitOps workflow where all infrastructure changes go through code review.

## Basic Atlantis Configuration

```yaml
# atlantis.yaml - Repository-level configuration

version: 3

projects:
  - name: prod-networking
    dir: environments/prod/networking
    workspace: default
    terraform_version: v1.7.0
    terraform_distribution: opentofu
    autoplan:
      when_modified: ["*.tf", "*.tfvars", "../../../modules/**/*.tf"]
      enabled: true

  - name: prod-app
    dir: environments/prod/app
    workspace: default
    terraform_version: v1.7.0
    terraform_distribution: opentofu
    autoplan:
      when_modified: ["*.tf", "*.tfvars"]
      enabled: true
    apply_requirements:
      - approved
      - mergeable
```

## Atlantis Server Configuration

```yaml
# atlantis-server.yaml
gh-user: atlantis-bot
gh-token: "${GITHUB_TOKEN}"
gh-webhook-secret: "${WEBHOOK_SECRET}"

# Use OpenTofu instead of Terraform
default-tf-distribution: opentofu

repo-config: /config/repos.yaml

port: 4141
```

## Server-Side Repo Config

```yaml
# repos.yaml - Server-level repository configuration
repos:
  - id: github.com/my-org/infrastructure
    allowed_overrides: [apply_requirements, workflow]
    allow_custom_workflows: true

    workflow: production
    apply_requirements: [approved, mergeable]

workflows:
  production:
    plan:
      steps:
        - run: checkov -d $PROJECT_DIR --framework terraform --quiet
        - init:
            extra_args: ["-upgrade"]
        - plan
    apply:
      steps:
        - apply
```

## PR Workflow in Practice

When a PR is opened:

```bash
# Atlantis automatically runs:
# atlantis plan -p prod-networking

# PR comment from Atlantis:
# Ran Plan for dir: environments/prod/networking
#
# Plan: 1 to add, 0 to change, 0 to destroy.
#
# To apply this plan, comment:
# atlantis apply -p prod-networking
```

## Lock Management

```bash
# If a workspace is locked by a previous PR
# atlantis will comment:
# This project is currently locked by #42

# To unlock manually:
# atlantis unlock -p prod-networking
```

## Custom Workflows with Pre-Apply Validation

```yaml
workflows:
  with-validation:
    plan:
      steps:
        - env:
            name: ENVIRONMENT
            value: production
        - run: |
            echo "Running pre-plan validation..."
            tofu fmt -check -recursive
            tofu validate
        - init
        - plan:
            extra_args: ["-compact-warnings"]

    apply:
      steps:
        - run: |
            echo "Running pre-apply smoke test..."
            curl -f https://api.example.com/health || exit 1
        - apply
        - run: |
            echo "Running post-apply validation..."
            sleep 30
            curl -f https://api.example.com/health
```

## Conclusion

Atlantis creates a GitHub-native GitOps workflow where plan output appears directly in PR comments. The `apply_requirements` configuration enforces approval gates before infrastructure changes can be applied. All changes are tracked in pull request history, creating a complete audit trail of who approved and applied what changes.
