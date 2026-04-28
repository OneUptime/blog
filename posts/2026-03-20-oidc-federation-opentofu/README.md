# How to Set Up OIDC Federation with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OIDC, GitHub Action, AWS, IAM, Federation, Infrastructure as Code

Description: Learn how to configure OIDC federation with AWS IAM using OpenTofu to enable keyless authentication from GitHub Actions, GitLab CI, and other OIDC-capable systems.

## Introduction

OpenID Connect (OIDC) federation lets CI/CD systems like GitHub Actions assume AWS IAM roles without storing long-lived credentials as secrets. The CI/CD platform presents a short-lived JWT and AWS validates it against the OIDC provider. OpenTofu manages the OIDC provider and IAM roles as code.

## Creating an OIDC Identity Provider

```hcl
# TLS certificate thumbprint for GitHub's OIDC endpoint

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  # Client IDs that GitHub Actions uses
  client_id_list = ["sts.amazonaws.com"]

  # Thumbprint of GitHub's OIDC certificate
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}
```

## IAM Role for GitHub Actions

```hcl
resource "aws_iam_role" "github_actions_deploy" {
  name = "github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github_actions.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        # Restrict to a specific GitHub repository and branch
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "github_deploy" {
  role       = aws_iam_role.github_actions_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}
```

## GitHub Actions Workflow

Use the role in your workflow without any stored AWS credentials.

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    permissions:
      id-token: write   # required for OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy with OpenTofu
        run: |
          tofu init
          tofu apply -auto-approve
```

## GitLab CI OIDC Provider

```hcl
data "tls_certificate" "gitlab" {
  url = "https://gitlab.com"
}

resource "aws_iam_openid_connect_provider" "gitlab" {
  url            = "https://gitlab.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.gitlab.certificates[0].sha1_fingerprint]
}

resource "aws_iam_role" "gitlab_ci_deploy" {
  name = "gitlab-ci-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.gitlab.arn }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "gitlab.com:sub" = "project_path:${var.gitlab_group}/${var.gitlab_project}:ref_type:branch:ref:main"
        }
      }
    }]
  })
}
```

## Outputs

```hcl
output "github_role_arn" {
  value = aws_iam_role.github_actions_deploy.arn
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

OIDC federation eliminates the need for long-lived AWS access keys in CI/CD pipelines. OpenTofu manages OIDC provider registration and IAM role trust policies, enabling secure, credential-free deployments from GitHub Actions, GitLab CI, and other OIDC-capable platforms.
