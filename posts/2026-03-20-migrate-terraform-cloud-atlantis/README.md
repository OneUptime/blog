# How to Migrate from Terraform Cloud to Atlantis with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Atlantis, Terraform Cloud, Migration, CI/CD, Infrastructure as Code

Description: Learn how to migrate your infrastructure workflows from Terraform Cloud to Atlantis running OpenTofu.

## Introduction

Atlantis is an open-source, self-hosted pull request automation tool for Terraform and OpenTofu. Migrating from Terraform Cloud to Atlantis gives you full control over your execution environment with no per-user licensing. Atlantis runs OpenTofu on your own infrastructure and integrates directly with GitHub, GitLab, or Bitbucket.

## Phase 1: Deploy Atlantis

Set up Atlantis using OpenTofu (dogfooding IaC).

```hcl
# atlantis-deployment/main.tf

resource "kubernetes_deployment" "atlantis" {
  metadata {
    name      = "atlantis"
    namespace = "atlantis"
  }

  spec {
    replicas = 1

    template {
      spec {
        container {
          name  = "atlantis"
          image = "ghcr.io/runatlantis/atlantis:latest"

          env {
            name  = "ATLANTIS_GH_TOKEN"
            value_from {
              secret_key_ref {
                name = "atlantis-secrets"
                key  = "github_token"
              }
            }
          }

          env {
            name  = "ATLANTIS_GH_WEBHOOK_SECRET"
            value_from {
              secret_key_ref {
                name = "atlantis-secrets"
                key  = "webhook_secret"
              }
            }
          }

          env {
            name  = "ATLANTIS_REPO_ALLOWLIST"
            value = "github.com/my-org/*"
          }
        }
      }
    }
  }
}
```

## Phase 2: Configure Atlantis for OpenTofu

Set the OpenTofu binary path in Atlantis configuration.

```yaml
# atlantis.yaml (in your repo root)

version: 3

projects:
  - name: app-production
    dir: environments/prod
    workspace: default
    workflow: opentofu

  - name: app-staging
    dir: environments/staging
    workspace: default
    workflow: opentofu

workflows:
  opentofu:
    plan:
      steps:
        - init:
            extra_args: ["-upgrade"]
        - plan:
            extra_args: ["-out", "plan.tfplan"]
    apply:
      steps:
        - apply:
            extra_args: ["plan.tfplan"]
```

```yaml
# atlantis-server.yaml
default-tf-distribution: opentofu  # Tell Atlantis to use OpenTofu instead of Terraform
```

## Phase 3: Migrate State from Terraform Cloud

Export state from Terraform Cloud and migrate to your own backend.

```bash
# Using the TFC API to download state
TFC_TOKEN="your-token"
WORKSPACE_ID="ws-xxxxxxxxxxxxx"

curl -s \
  -H "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/current-state-version" | \
  jq -r '.data.attributes["hosted-state-download-url"]' | \
  xargs curl -s -o terraform.tfstate

# Verify the state file
tofu state list -state=terraform.tfstate
```

```hcl
# Update backend configuration
terraform {
  backend "s3" {
    bucket       = "my-tofu-state"
    key          = "environments/prod/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

```bash
# Migrate state from TFC to S3
tofu init -migrate-state
```

## Phase 4: Configure GitHub Webhooks

Set up webhooks to trigger Atlantis on pull requests.

```bash
# Add webhook to GitHub repository
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/my-org/infrastructure/hooks" \
  -d '{
    "name": "web",
    "events": ["push", "issue_comment", "pull_request", "pull_request_review"],
    "config": {
      "url": "https://atlantis.internal.example.com/events",
      "content_type": "json",
      "secret": "your-webhook-secret"
    }
  }'
```

## Phase 5: Set Up Atlantis Access Controls

Configure repo-level access controls to match TFC team permissions.

```yaml
# repos.yaml (Atlantis server-side configuration)
repos:
  - id: "github.com/my-org/infrastructure"
    allowed_overrides:
      - workflow
      - apply_requirements
    apply_requirements:
      - approved
      - mergeable
```

Atlantis only checks that *someone* has approved the PR. To require approval from a specific GitHub team (e.g. `my-org/infrastructure-team`), configure that in the repository's GitHub branch protection rules - Atlantis honors those rules through the `approved` requirement.

## Phase 6: Validate and Cut Over

```bash
# Open a test PR to verify Atlantis integration
# Atlantis should automatically comment with a plan

# Example PR comment format:
# atlantis plan -d environments/prod
# atlantis apply -d environments/prod

# Once validated:
# 1. Update documentation to reference Atlantis workflow
# 2. Archive TFC workspaces (don't delete immediately)
# 3. Remove TFC VCS webhooks
```

## Summary

Migrating from Terraform Cloud to Atlantis with OpenTofu requires deploying Atlantis (on Kubernetes or a VM), configuring it to use the OpenTofu binary, migrating state files to your own S3 backend, and setting up GitHub webhooks to trigger Atlantis on PRs. The `atlantis.yaml` file in your repository gives you fine-grained control over which directories trigger plans and what workflows to use. The self-hosted model gives you complete control over compute, networking, and execution environment.
