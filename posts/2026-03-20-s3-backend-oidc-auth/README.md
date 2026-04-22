# How to Configure S3 Backend with OIDC Authentication in OpenTofu - Auth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, AWS, Security, CI/CD

Description: Learn how to configure the OpenTofu S3 backend with OIDC (OpenID Connect) authentication for keyless AWS access from GitHub Actions, GitLab CI, and other OIDC-capable CI/CD platforms.

## Introduction

OIDC authentication eliminates the need for long-lived AWS credentials in CI/CD pipelines. Instead of storing AWS access keys as secrets, your CI/CD platform exchanges a short-lived OIDC token for temporary AWS credentials. OpenTofu's S3 backend works seamlessly with OIDC when credentials are configured in the environment.

## How OIDC Works with AWS

1. CI/CD platform generates a signed JWT (OIDC token)
2. AWS STS exchanges the token for temporary credentials via `sts:AssumeRoleWithWebIdentity`
3. OpenTofu uses these temporary credentials for S3 backend access

## Step 1: Set Up the OIDC Identity Provider in AWS

```hcl
# oidc.tf - Run once to configure AWS to trust your CI/CD OIDC provider

# GitHub Actions OIDC Provider

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]
}

# IAM role that GitHub Actions can assume
resource "aws_iam_role" "github_actions" {
  name = "github-actions-opentofu"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # Restrict to a specific repository
            "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:*"
          }
        }
      }
    ]
  })
}

# Grant the role state management permissions
resource "aws_iam_role_policy" "github_actions_state" {
  name = "TerraformStateAccess"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "arn:aws:s3:::my-terraform-state/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::my-terraform-state"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:DescribeTable", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/terraform-state-locks"
      }
    ]
  })
}
```

## Step 2: Configure the S3 Backend (No Credentials Needed)

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
    # No credentials here - provided by the environment
  }
}
```

## Step 3: Configure GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

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
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-opentofu
          role-session-name: GitHubActions-OpenTofu
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: OpenTofu Init
        run: tofu init
        # S3 backend uses the OIDC-provided credentials automatically

      - name: OpenTofu Plan
        run: tofu plan -out=plan.tfplan

      - name: OpenTofu Apply
        if: github.ref == 'refs/heads/main'
        run: tofu apply plan.tfplan
```

## GitLab CI with OIDC

```yaml
# .gitlab-ci.yml
deploy:
  image: my-opentofu-ci:latest # Include OpenTofu and a POSIX shell
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: sts.amazonaws.com
  script:
    - printf '%s' "$GITLAB_OIDC_TOKEN" > /tmp/gitlab-oidc-token
    - export AWS_ROLE_ARN=arn:aws:iam::123456789012:role/gitlab-ci-opentofu
    - export AWS_ROLE_SESSION_NAME="gitlab-ci-${CI_PROJECT_ID}-${CI_PIPELINE_ID}"
    - export AWS_WEB_IDENTITY_TOKEN_FILE=/tmp/gitlab-oidc-token
    - tofu init
    - tofu apply -auto-approve
```

## Restricting OIDC Claims

Tighten the assume role policy for production:

```hcl
# Only allow the main branch to deploy to production
Condition = {
  StringEquals = {
    "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
    "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:ref:refs/heads/main"
  }
}
```

## Conclusion

OIDC authentication for the S3 backend eliminates long-lived AWS credentials from CI/CD pipelines, significantly improving security. When combined with short-lived IAM role sessions and restrictive claim conditions, it provides a zero-standing-privilege model for infrastructure deployments. GitHub Actions, GitLab CI, CircleCI, and most modern CI/CD platforms support OIDC natively.
