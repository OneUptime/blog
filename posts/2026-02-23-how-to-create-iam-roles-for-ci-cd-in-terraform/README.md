# How to Create IAM Roles for CI/CD in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, CI/CD, GitHub Actions, DevOps, OIDC

Description: Learn how to create secure IAM roles for CI/CD pipelines in Terraform using OIDC federation with GitHub Actions, GitLab CI, and other providers.

---

CI/CD pipelines need AWS credentials to deploy infrastructure, push container images, update Lambda functions, and perform other deployment tasks. The traditional approach of storing long-lived access keys as secrets in your CI/CD system is insecure and difficult to manage. Modern CI/CD platforms support OpenID Connect (OIDC) federation, which lets your pipeline assume an IAM role directly without any stored credentials.

This guide shows you how to create IAM roles for CI/CD pipelines in Terraform, focusing on OIDC federation with GitHub Actions, GitLab CI, and other popular platforms.

## Why OIDC for CI/CD?

OIDC federation eliminates long-lived credentials from your CI/CD configuration. Instead of storing access keys:

- The CI/CD platform issues a short-lived JWT token for each pipeline run.
- The pipeline exchanges this token for temporary AWS credentials by assuming an IAM role.
- The credentials expire automatically when the pipeline finishes.
- No secrets to rotate, no keys to leak.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM permissions
- A CI/CD platform that supports OIDC (GitHub Actions, GitLab CI, Bitbucket Pipelines, etc.)

## GitHub Actions OIDC Setup

GitHub Actions is the most popular CI/CD platform for OIDC with AWS. Here is the complete setup.

### Step 1: Create the OIDC Provider

```hcl
# Create the GitHub OIDC provider
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC thumbprint
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    Purpose   = "github-actions-oidc"
    ManagedBy = "terraform"
  }
}
```

### Step 2: Create the IAM Role

```hcl
# Trust policy for GitHub Actions
data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    # Restrict to specific repository
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [
        "repo:my-org/my-repo:ref:refs/heads/main",
        "repo:my-org/my-repo:ref:refs/heads/release/*",
      ]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "github-actions-deploy-role"
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust.json
  max_session_duration = 3600

  tags = {
    Purpose = "github-actions"
  }
}
```

### Step 3: Attach Deployment Permissions

```hcl
# Deployment policy for the CI/CD role
resource "aws_iam_policy" "deploy_policy" {
  name        = "github-actions-deploy-policy"
  description = "Permissions for GitHub Actions deployments"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # ECR permissions for container image management
        Sid    = "ECRAccess"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ]
        Resource = "*"
      },
      {
        # ECS deployment permissions
        Sid    = "ECSAccess"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:DeregisterTaskDefinition",
        ]
        Resource = "*"
      },
      {
        # Pass role to ECS tasks
        Sid    = "PassRole"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = [
          "arn:aws:iam::*:role/ecs-*",
        ]
      },
      {
        # S3 for deployment artifacts
        Sid    = "S3Artifacts"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::deployment-artifacts",
          "arn:aws:s3:::deployment-artifacts/*",
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_deploy" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.deploy_policy.arn
}
```

### Step 4: Configure the GitHub Actions Workflow

Here is the corresponding GitHub Actions workflow configuration:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy-role
          aws-region: us-east-1

      - name: Deploy
        run: |
          # Your deployment commands here
          aws ecs update-service --cluster my-cluster --service my-service
```

## GitLab CI OIDC Setup

GitLab CI also supports OIDC federation with AWS.

```hcl
# Create the GitLab OIDC provider
resource "aws_iam_openid_connect_provider" "gitlab" {
  url = "https://gitlab.com"

  client_id_list = ["https://gitlab.com"]

  thumbprint_list = ["b3dd7606d2b5a8b4a13771dbecc9ee1cecafa38a"]

  tags = {
    Purpose = "gitlab-ci-oidc"
  }
}

# Trust policy for GitLab CI
data "aws_iam_policy_document" "gitlab_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.gitlab.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "gitlab.com:aud"
      values   = ["https://gitlab.com"]
    }

    # Restrict to specific project and branch
    condition {
      test     = "StringLike"
      variable = "gitlab.com:sub"
      values   = [
        "project_path:my-group/my-project:ref_type:branch:ref:main",
      ]
    }
  }
}

resource "aws_iam_role" "gitlab_ci" {
  name               = "gitlab-ci-deploy-role"
  assume_role_policy = data.aws_iam_policy_document.gitlab_trust.json
}
```

## Multiple Roles for Different Pipeline Stages

Create separate roles for different pipeline stages with appropriate permissions.

```hcl
# Define roles for different pipeline stages
variable "pipeline_roles" {
  type = map(object({
    branches    = list(string)
    policy_arns = list(string)
  }))
  default = {
    test = {
      branches    = ["repo:my-org/my-repo:*"]
      policy_arns = ["arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"]
    }
    staging = {
      branches = [
        "repo:my-org/my-repo:ref:refs/heads/develop",
        "repo:my-org/my-repo:ref:refs/heads/release/*",
      ]
      policy_arns = [
        "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
        "arn:aws:iam::aws:policy/AmazonECR_FullAccess",
      ]
    }
    production = {
      branches    = ["repo:my-org/my-repo:ref:refs/heads/main"]
      policy_arns = [
        "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
        "arn:aws:iam::aws:policy/AmazonECR_FullAccess",
      ]
    }
  }
}

# Create trust policies per stage
data "aws_iam_policy_document" "pipeline_trusts" {
  for_each = var.pipeline_roles

  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = each.value.branches
    }
  }
}

# Create roles
resource "aws_iam_role" "pipeline_roles" {
  for_each = var.pipeline_roles

  name               = "github-actions-${each.key}-role"
  assume_role_policy = data.aws_iam_policy_document.pipeline_trusts[each.key].json
}

# Attach policies
locals {
  role_policy_pairs = flatten([
    for stage, config in var.pipeline_roles : [
      for arn in config.policy_arns : {
        stage      = stage
        policy_arn = arn
      }
    ]
  ])
}

resource "aws_iam_role_policy_attachment" "pipeline_policies" {
  for_each = {
    for pair in local.role_policy_pairs :
    "${pair.stage}-${pair.policy_arn}" => pair
  }

  role       = aws_iam_role.pipeline_roles[each.value.stage].name
  policy_arn = each.value.policy_arn
}
```

## Terraform-Specific CI/CD Role

If your CI/CD pipeline runs Terraform, the role needs permissions to manage infrastructure.

```hcl
resource "aws_iam_policy" "terraform_deploy" {
  name = "terraform-deploy-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Terraform state management
        Sid    = "TerraformState"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::terraform-state-bucket",
          "arn:aws:s3:::terraform-state-bucket/*",
        ]
      },
      {
        # DynamoDB for state locking
        Sid    = "TerraformLock"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/terraform-locks"
      },
      {
        # Permissions for the resources Terraform manages
        Sid    = "InfraManagement"
        Effect = "Allow"
        Action = [
          "ec2:*",
          "ecs:*",
          "ecr:*",
          "s3:*",
          "rds:*",
          "elasticloadbalancing:*",
          "route53:*",
          "acm:*",
          "iam:*",
          "logs:*",
          "cloudwatch:*",
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Security Restrictions

Always restrict CI/CD roles to prevent abuse.

```hcl
# Add deny statements to prevent dangerous actions
resource "aws_iam_policy" "cicd_guardrails" {
  name = "cicd-guardrails"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyDangerousActions"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:CreateAccessKey",
          "organizations:*",
          "account:*",
        ]
        Resource = "*"
      },
      {
        # Prevent the CI/CD role from modifying its own trust policy
        Sid    = "DenySelfModification"
        Effect = "Deny"
        Action = [
          "iam:UpdateAssumeRolePolicy",
        ]
        Resource = "arn:aws:iam::*:role/github-actions-*"
      }
    ]
  })
}
```

## Best Practices

1. **Use OIDC over access keys.** Modern CI/CD platforms all support OIDC. There is rarely a reason to use static credentials.
2. **Restrict by branch.** Use the `sub` claim to limit which branches can assume production roles.
3. **Separate roles by environment.** Test, staging, and production should each have their own role with appropriate permissions.
4. **Add deny statements.** Prevent the CI/CD role from performing dangerous actions like creating IAM users.
5. **Use short session durations.** CI/CD pipelines are short-lived; set the max session to 1 hour.
6. **Audit with CloudTrail.** Monitor what your CI/CD roles are doing in your account.

For related topics, see [How to Create OIDC Identity Providers in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-oidc-identity-providers-in-terraform/view) and [How to Create STS Assume Role Policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-sts-assume-role-policies-in-terraform/view).

## Conclusion

OIDC federation has transformed how CI/CD pipelines authenticate with AWS. By creating IAM roles with tightly scoped trust policies and permissions, you can give your pipelines the access they need without the risk of leaked credentials. Terraform makes it straightforward to manage the OIDC provider, create environment-specific roles, and enforce security guardrails. Start by setting up OIDC for your most critical pipeline, then expand to cover all your deployment workflows.
