# How to Configure S3 Backend with OIDC Authentication in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, AWS, Security

Description: Learn how to configure the OpenTofu S3 backend with OIDC (OpenID Connect) authentication for keyless CI/CD deployments using GitHub Actions or other OIDC providers.

## Introduction

OIDC authentication allows CI/CD systems like GitHub Actions to access AWS resources without long-lived access keys. Instead, the CI/CD system exchanges a short-lived OIDC token for temporary AWS credentials. This eliminates the need to store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as CI/CD secrets.

## How OIDC Works

```text
GitHub Actions
    → Requests OIDC token from GitHub
    → Exchanges token with AWS STS for temp credentials
    → Uses temp credentials to access S3 state
```

## AWS Setup: OIDC Identity Provider

```hcl
# Create the OIDC identity provider for GitHub Actions

resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM role that GitHub Actions will assume
resource "aws_iam_role" "github_actions_terraform" {
  name = "GitHubActionsTerraformRole"

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
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:acme-org/infra:*"
        }
      }
    }]
  })
}

# Attach state access permissions
resource "aws_iam_role_policy" "state_access" {
  role = aws_iam_role.github_actions_terraform.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "arn:aws:s3:::my-tofu-state/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::my-tofu-state"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/tofu-state-lock"
      }
    ]
  })
}
```

## OpenTofu Backend Configuration

The backend configuration itself does not reference OIDC - credentials are provided by the environment:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-tofu-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tofu-state-lock"
  }
}
```

## GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

permissions:
  id-token: write    # Required for OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Configure AWS credentials via OIDC - no access keys needed
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsTerraformRole
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Initialize
        run: tofu init

      - name: Plan
        run: tofu plan

      - name: Apply
        if: github.ref == 'refs/heads/main'
        run: tofu apply -auto-approve
```

## GitLab CI with OIDC

```yaml
# .gitlab-ci.yml
deploy:
  image: ghcr.io/opentofu/opentofu:latest
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://gitlab.com
  before_script:
    - STS=$(aws sts assume-role-with-web-identity
        --role-arn $AWS_ROLE_ARN
        --role-session-name gitlab-terraform
        --web-identity-token "$GITLAB_OIDC_TOKEN"
        --duration-seconds 3600)
    - export AWS_ACCESS_KEY_ID=$(echo $STS | jq -r .Credentials.AccessKeyId)
    - export AWS_SECRET_ACCESS_KEY=$(echo $STS | jq -r .Credentials.SecretAccessKey)
    - export AWS_SESSION_TOKEN=$(echo $STS | jq -r .Credentials.SessionToken)
  script:
    - tofu init
    - tofu apply -auto-approve
```

## Conclusion

OIDC authentication for the S3 backend eliminates long-lived AWS credentials from CI/CD pipelines. GitHub Actions and GitLab CI both support OIDC natively - configure the AWS OIDC identity provider, create a role with the appropriate conditions and permissions, and let the CI/CD platform exchange tokens for temporary credentials automatically. This is the most secure authentication pattern for CI/CD deployments.
