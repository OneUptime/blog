# How to Manage IAM Roles with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, IAM Roles, AWS, Security, OIDC, Infrastructure as Code

Description: Learn how to manage AWS IAM Roles with OpenTofu - creating service roles, cross-account roles, OIDC federation for CI/CD, permission boundaries, and role chaining patterns.

## Introduction

IAM Roles provide temporary credentials to AWS services, EC2 instances, Lambda functions, and external systems without storing long-lived access keys. OpenTofu manages role trust policies, permission policies, instance profiles, and OIDC identity providers for keyless CI/CD authentication.

## Service Role for EC2

```hcl
resource "aws_iam_role" "ec2_app" {
  name        = "${var.environment}-ec2-app-role"
  description = "Role assumed by EC2 app instances"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Environment = var.environment }
}

resource "aws_iam_role_policy" "ec2_app" {
  name = "ec2-app-policy"
  role = aws_iam_role.ec2_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = ["arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:/${var.environment}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = ["${aws_s3_bucket.app.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["cloudwatch:PutMetricData"]
        Resource = ["*"]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_app" {
  name = "${var.environment}-ec2-app-profile"
  role = aws_iam_role.ec2_app.name
}
```

## Permission Boundary

```hcl
# Permission boundary limits the maximum permissions of application roles in non-production

resource "aws_iam_policy" "developer_boundary" {
  name        = "DeveloperPermissionBoundary"
  description = "Maximum permissions application roles can receive in non-production"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ec2:*", "s3:*", "rds:*", "lambda:*", "logs:*"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = ["dev", "staging"]
          }
        }
      }
    ]
  })
}

# Apply boundary when creating the role
resource "aws_iam_role" "app_service" {
  name                 = "${var.environment}-app-service"
  permissions_boundary = aws_iam_policy.developer_boundary.arn

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}
```

## Cross-Account Role

```hcl
# Role in account A that allows account B to assume it
resource "aws_iam_role" "cross_account" {
  name = "${var.environment}-cross-account-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${var.trusted_account_id}:root" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "sts:ExternalId" = var.external_id  # Prevents confused deputy attacks
        }
        Bool = {
          "aws:MultiFactorAuthPresent" = "true"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cross_account_readonly" {
  role       = aws_iam_role.cross_account.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

## OIDC Role for GitHub Actions (Keyless CI/CD)

```hcl
# Create OIDC provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]
}

# Role assumed by GitHub Actions
resource "aws_iam_role" "github_actions" {
  name        = "${var.environment}-github-actions-role"
  description = "Role for GitHub Actions CI/CD pipeline"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Restrict to specific repository and branch
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main"
        }
      }
    }]
  })

  tags = { Purpose = "CI/CD" }
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "github-actions-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:UpdateService", "ecs:DescribeServices"]
        Resource = [aws_ecs_service.app.id]
      }
    ]
  })
}
```

## Execution Role for Step Functions

```hcl
# Step Functions execution role that can invoke Lambda
resource "aws_iam_role" "step_functions" {
  name = "${var.environment}-step-functions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "states.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "step_functions" {
  name = "step-functions-invoke"
  role = aws_iam_role.step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = [
          "${aws_lambda_function.process.arn}",
          "${aws_lambda_function.notify.arn}"
        ]
      },
      {
        Effect   = "Allow"
        Action   = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets"
        ]
        Resource = ["*"]
      }
    ]
  })
}
```

## Conclusion

IAM Roles with OpenTofu are the foundation of least-privilege access in AWS. Use OIDC federation (GitHub Actions, GitLab, CircleCI) to eliminate static access keys from CI/CD pipelines - tokens are short-lived and scoped to specific repositories. Apply permission boundaries to the roles teams create, and pair them with IAM policies that require `iam:PermissionsBoundary` on role-creation APIs, to prevent privilege escalation. For third-party cross-account access, require `sts:ExternalId` to prevent the confused deputy problem. Attach managed policies with `aws_iam_role_policy_attachment` for AWS-managed policies and inline policies with `aws_iam_role_policy` for custom application-specific permissions.
