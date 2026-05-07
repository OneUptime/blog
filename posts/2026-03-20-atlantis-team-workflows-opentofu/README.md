# How to Use Atlantis for Team OpenTofu Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Atlantis, Pull Requests, GitOps, Team Workflows, Infrastructure as Code

Description: Learn how to set up Atlantis to automate OpenTofu plan and apply workflows directly from GitHub pull request comments, enabling GitOps for infrastructure with audit trails and approval gates.

---

Atlantis is a self-hosted PR automation tool that can run `tofu plan` and `tofu apply` in response to pull request comments when you configure the project to use the OpenTofu distribution. It keeps the plan/apply cycle inside the PR, creating a clear audit trail of who approved and applied each change.

## Atlantis Workflow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant PR as GitHub PR
    participant Atlantis as Atlantis
    participant Cloud as Cloud Provider

    Dev->>PR: Open PR
    Atlantis->>PR: Comment: plan output
    Dev->>PR: Comment: atlantis apply
    Atlantis->>Cloud: tofu apply
    Atlantis->>PR: Comment: apply complete
    PR-->>PR: Auto-merge
```

## Atlantis Configuration

```yaml
# atlantis.yaml - project configuration

version: 3
automerge: true
delete_source_branch_on_merge: true

projects:
  - name: production
    dir: environments/production
    workspace: default
    terraform_distribution: opentofu
    terraform_version: v1.6.0
    autoplan:
      when_modified:
        - "*.tf"
        - "*.tfvars"
        - "../../modules/**/*.tf"
      enabled: true
    apply_requirements:
      - approved
      - mergeable
    workflow: production

  - name: staging
    dir: environments/staging
    workspace: default
    terraform_distribution: opentofu
    autoplan:
      when_modified: ["*.tf", "*.tfvars"]
      enabled: true
    apply_requirements:
      - approved

workflows:
  production:
    plan:
      steps:
        - init
        - plan:
            extra_args: ["-var-file=production.tfvars"]
    apply:
      steps:
        - apply
```

## Deploying Atlantis on Kubernetes

```hcl
# atlantis.tf
resource "helm_release" "atlantis" {
  name             = "atlantis"
  repository       = "https://runatlantis.github.io/helm-charts"
  chart            = "atlantis"
  version          = "6.4.0"
  namespace        = "atlantis"
  create_namespace = true

  values = [
    yamlencode({
      atlantisUrl = "https://atlantis.${var.domain}"

      github = {
        user = var.github_user
      }

      vcsSecretName = "atlantis-secrets"

      orgAllowlist = "github.com/myorg/*"

      repoConfig = <<-EOT
        repos:
          - id: /.*/
            apply_requirements: [approved, mergeable]
            allowed_overrides: [workflow, apply_requirements, delete_source_branch_on_merge]
            allow_custom_workflows: true
      EOT

      environmentSecrets = [
        {
          name = "AWS_ACCESS_KEY_ID"
          secretKeyRef = {
            name = "atlantis-secrets"
            key  = "aws-access-key-id"
          }
        },
        {
          name = "AWS_SECRET_ACCESS_KEY"
          secretKeyRef = {
            name = "atlantis-secrets"
            key  = "aws-secret-access-key"
          }
        },
      ]

      resources = {
        requests = { cpu = "100m", memory = "256Mi" }
        limits   = { cpu = "500m", memory = "512Mi" }
      }

      persistence = {
        enabled      = true
        storageClass = "gp3"
        size         = "5Gi"
      }
    })
  ]
}
```

## PR Comment Commands

```bash
# Trigger a plan manually
atlantis plan

# Plan with specific variables
atlantis plan -- -var="instance_type=t3.large"

# Apply after approval
atlantis apply

# Apply specific project
atlantis apply -p production

# Discard the pending plan
atlantis unlock
```

## Repo-Level Webhook Configuration

```hcl
resource "github_repository_webhook" "atlantis" {
  repository = var.infra_repo

  configuration {
    url          = "https://atlantis.${var.domain}/events"
    content_type = "json"
    secret       = var.webhook_secret
    insecure_ssl = false
  }

  events = [
    "issue_comment",
    "pull_request",
    "pull_request_review",
    "push",
  ]
}
```

## Best Practices

- Set `apply_requirements: [approved, mergeable]` in `atlantis.yaml`, and allow that override in Atlantis server-side repo config, to prevent applies without PR approval and mergeability checks.
- Use `autoplan: enabled: true` with `when_modified` patterns so Atlantis plans automatically when relevant files change.
- Deploy Atlantis with persistent storage - it stores plan files between plan and apply operations.
- Use a strong webhook secret for Atlantis webhooks; Atlantis expects the same secret across repositories, and you should rotate it like any credential.
- Enable `automerge: true` for non-production environments to streamline low-risk changes.
