# How to Authenticate with AWS Using OIDC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, OIDC, Authentication, GitHub Action, CI/CD, Security

Description: Learn how to configure OpenID Connect (OIDC) federation so GitHub Actions and other CI/CD systems can authenticate to AWS without storing long-lived credentials.

---

OIDC federation lets external identity providers (like GitHub Actions, GitLab CI, or CircleCI) exchange short-lived OIDC tokens for temporary AWS credentials. This eliminates the need to store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as secrets in your CI/CD system.

---

## Create the OIDC Identity Provider in AWS

```bash
# For GitHub Actions

aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

---

## Create an IAM Role for GitHub Actions

```hcl
# opentofu: iam-oidc.tf
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_role" "github_actions" {
  name = "github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = data.aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:myorg/myrepo:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "deploy" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}
```

---

## Configure GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

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

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-role
          aws-region: us-east-1

      - name: Deploy to S3
        run: aws s3 sync ./dist s3://my-bucket
```

---

## Restrict by Branch

```hcl
Condition = {
  StringEquals = {
    "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
    "token.actions.githubusercontent.com:sub" = "repo:myorg/myrepo:ref:refs/heads/main"
  }
}
```

---

## Summary

Create an AWS OIDC identity provider for your CI/CD platform, then define an IAM role with a trust policy that validates the OIDC token's claims. In GitHub Actions, use `permissions: id-token: write` and the `configure-aws-credentials` action to exchange the OIDC token for temporary AWS credentials. No long-lived secrets needed.
