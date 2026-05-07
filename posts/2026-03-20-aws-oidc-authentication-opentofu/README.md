# How to Use AWS OIDC Authentication with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, OIDC, Authentication, GitHub Action, CI/CD

Description: Learn how to configure AWS OIDC authentication for OpenTofu in GitHub Actions and GitLab CI, eliminating the need for long-lived AWS access keys in CI/CD pipelines.

## Introduction

OpenID Connect (OIDC) allows CI/CD platforms like GitHub Actions and GitLab CI to authenticate to AWS without storing long-lived access keys as secrets. AWS issues short-lived credentials for each pipeline run, tied to the specific repository and workflow-dramatically reducing the blast radius of any credential compromise.

## Step 1: Create the OIDC Identity Provider in AWS

```hcl
# Create the GitHub Actions OIDC provider in AWS

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  # The client ID must be "sts.amazonaws.com" for GitHub Actions
  client_id_list = ["sts.amazonaws.com"]
}
```

## Step 2: Create the IAM Role with a Trust Policy

```hcl
resource "aws_iam_role" "github_actions" {
  name = "GitHubActionsOpenTofuRole"

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
            # Restrict to a specific repository and branch
            "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

# Attach the necessary permissions to the role
resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  # Use a least-privilege policy in production
}
```

## Step 3: Configure the GitHub Actions Workflow

```yaml
# .github/workflows/opentofu.yml
name: OpenTofu Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      # Required for OIDC token generation
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsOpenTofuRole
          aws-region: us-east-1
          # Optional: set session duration
          role-duration-seconds: 3600

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.7.0"

      - name: OpenTofu Init
        run: tofu init

      - name: OpenTofu Plan
        run: tofu plan -out=tfplan

      - name: OpenTofu Apply
        run: tofu apply tfplan
```

## GitLab CI with AWS OIDC

For GitLab CI, configure the OIDC provider URL to `https://gitlab.com` (or your self-hosted URL):

```hcl
resource "aws_iam_openid_connect_provider" "gitlab" {
  url            = "https://gitlab.com"
  client_id_list = ["https://gitlab.com"]
}

resource "aws_iam_role" "gitlab_ci" {
  name = "GitLabCIOpenTofuRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.gitlab.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "gitlab.com:sub" = "project_path:my-group/my-project:ref_type:branch:ref:main"
        }
      }
    }]
  })
}
```

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  image: ghcr.io/opentofu/opentofu:1.7.0
  id_tokens:
    AWS_WEB_IDENTITY_TOKEN:
      aud: https://gitlab.com
  variables:
    AWS_ROLE_ARN: "arn:aws:iam::123456789012:role/GitLabCIOpenTofuRole"
    AWS_DEFAULT_REGION: "us-east-1"
    AWS_WEB_IDENTITY_TOKEN_FILE: /tmp/aws-token
  before_script:
    - echo $AWS_WEB_IDENTITY_TOKEN > /tmp/aws-token
  script:
    - tofu init
    - tofu apply -auto-approve
```

## Conclusion

OIDC authentication is the modern, credentials-free way to connect CI/CD pipelines to AWS. By creating an identity provider and a scoped trust policy, you eliminate long-lived access keys while maintaining fine-grained control over which repositories and branches can assume which roles.
