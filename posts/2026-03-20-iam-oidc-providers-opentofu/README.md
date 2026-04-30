# How to Create IAM OIDC Providers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, OIDC, GitHub Action, CI/CD, Infrastructure as Code, Workload Identity

Description: Learn how to create IAM OIDC providers using OpenTofu to enable keyless authentication from GitHub Actions, GitLab CI, and other CI/CD systems to AWS without storing long-lived credentials.

## Introduction

IAM OIDC Providers allow external identity providers to authenticate to AWS using OpenID Connect. This enables CI/CD pipelines in GitHub Actions, GitLab CI, and Kubernetes to assume IAM roles without storing AWS access keys, significantly improving security posture.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM permissions
- A CI/CD platform supporting OIDC (GitHub Actions, GitLab CI, etc.)

## Step 1: Create OIDC Provider for GitHub Actions

```hcl
# Create the GitHub Actions OIDC provider
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  # Client IDs that are valid for this provider
  client_id_list = ["sts.amazonaws.com"]

  tags = {
    Name     = "github-actions-oidc"
    Provider = "GitHub"
  }
}
```

## Step 2: Create IAM Role for GitHub Actions

```hcl
# IAM role that GitHub Actions workflows can assume
resource "aws_iam_role" "github_actions_deploy" {
  name        = "GitHubActionsDeploy"
  description = "Role assumed by GitHub Actions for deployment"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Restrict to a specific organization/repository and branch or environment
          "token.actions.githubusercontent.com:sub" = [
            "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main",
            "repo:${var.github_org}/${var.github_repo}:environment:production"
          ]
        }
      }
    }]
  })

  tags = {
    Name      = "github-actions-deploy"
    ManagedBy = "GitHubActions"
  }
}

# Attach deployment permissions
resource "aws_iam_role_policy_attachment" "github_ecr" {
  role       = aws_iam_role.github_actions_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess"
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "github-deployment-policy"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["ecs:UpdateService", "ecs:DescribeServices", "lambda:UpdateFunctionCode"]
      Resource = "*"
      Condition = {
        StringEquals = {
          "aws:ResourceTag/Environment" = "production"
          "aws:ResourceTag/ManagedBy"   = "GitHubActions"
        }
      }
    }]
  })
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions_deploy.arn
}
```

## Step 3: GitHub Actions Workflow Using OIDC

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Configure AWS Credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeploy
          role-session-name: GitHubActionsSession
          aws-region: us-east-1

      - name: Deploy
        run: |
          aws ecs update-service \
            --cluster production \
            --service my-service \
            --force-new-deployment
```

## Step 4: Create OIDC Provider for GitLab CI

```hcl
# GitLab OIDC provider
resource "aws_iam_openid_connect_provider" "gitlab" {
  url            = "https://gitlab.example.com"
  client_id_list = ["https://gitlab.example.com"]

  tags = { Name = "gitlab-ci-oidc" }
}

resource "aws_iam_role" "gitlab_ci" {
  name = "GitLabCIRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = aws_iam_openid_connect_provider.gitlab.arn
      }
      Condition = {
        StringEquals = {
          "gitlab.example.com:sub" = "project_path:${var.gitlab_group}/${var.gitlab_project}:ref_type:branch:ref:main"
        }
      }
    }]
  })
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Output the role ARN for CI/CD configuration
tofu output -raw github_actions_role_arn
```

## Conclusion

OIDC-based authentication eliminates long-lived AWS credentials in CI/CD pipelines, dramatically reducing the blast radius of compromised credentials. Always restrict the OIDC condition to specific repositories and branches/environments to prevent any forked repository from assuming your deployment role. Regularly audit which repositories have access using IAM Access Analyzer's finding for external access.
