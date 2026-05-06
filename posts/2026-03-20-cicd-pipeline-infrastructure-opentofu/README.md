# How to Build a CI/CD Pipeline Infrastructure with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CI/CD, GitHub Action, ECS, ECR, Infrastructure as Code

Description: Learn how to build the infrastructure for a CI/CD pipeline on AWS with OpenTofu, including ECR repositories, ECS deployment targets, IAM roles for GitHub Actions, and pipeline notifications.

## Introduction

CI/CD pipeline infrastructure includes more than the pipeline itself - it requires ECR repositories for container images, deployment targets (ECS clusters), IAM roles for pipeline runners, artifact storage (S3), and notification channels. This guide provisions all of these with OpenTofu.

## ECR Repositories

```hcl
locals {
  services = toset(["api", "worker", "frontend"])
}

resource "aws_kms_key" "ecr" {
  description = "KMS key for ECR repositories"
}

resource "aws_ecr_repository" "services" {
  for_each = local.services

  name                 = "myapp/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = local.services
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 prod images"
        selection = {
          tagStatus      = "tagged"
          tagPrefixList  = ["prod-"]
          countType      = "imageCountMoreThan"
          countNumber    = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 staging images"
        selection = {
          tagStatus      = "tagged"
          tagPrefixList  = ["staging-"]
          countType      = "imageCountMoreThan"
          countNumber    = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 3
        description  = "Keep last 10 dev images"
        selection = {
          tagStatus      = "tagged"
          tagPrefixList  = ["dev-"]
          countType      = "imageCountMoreThan"
          countNumber    = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 4
        description  = "Remove untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}
```

## GitHub Actions OIDC Integration

```hcl
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub's thumbprint - verify this is current
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_actions" {
  name = "github-actions-deploy"

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
          "token.actions.githubusercontent.com:sub" = "repo:my-org/my-app:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "github-actions-deploy-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = [for repo in aws_ecr_repository.services : repo.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:UpdateService", "ecs:DescribeServices"]
        Resource = "arn:aws:ecs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:service/*"
      }
    ]
  })
}
```

## S3 Bucket for Build Artifacts

```hcl
resource "aws_s3_bucket" "artifacts" {
  bucket = "myapp-cicd-artifacts-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "expire-old-artifacts"
    status = "Enabled"

    expiration {
      days = 30  # keep artifacts for 30 days
    }
  }
}
```

## Deployment Notifications

```hcl
resource "aws_sns_topic" "deployments" {
  name = "cicd-deployments"
}

resource "aws_sns_topic_subscription" "webhook" {
  topic_arn = aws_sns_topic.deployments.arn
  protocol  = "https"
  # The endpoint must confirm the SNS subscription and accept SNS POST payloads.
  endpoint  = var.notification_endpoint
}

resource "aws_sns_topic_policy" "deployments" {
  arn = aws_sns_topic.deployments.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "events.amazonaws.com"
      }
      Action   = "sns:Publish"
      Resource = aws_sns_topic.deployments.arn
    }]
  })
}

# EventBridge rule to catch ECS deployment events

resource "aws_cloudwatch_event_rule" "ecs_deployments" {
  name        = "ecs-deployment-events"
  description = "Capture ECS service deployment state changes"

  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Deployment State Change"]
    detail = {
      eventType = ["INFO", "ERROR"]
    }
  })
}

resource "aws_cloudwatch_event_target" "deployment_sns" {
  rule      = aws_cloudwatch_event_rule.ecs_deployments.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.deployments.arn
}
```

## Summary

CI/CD pipeline infrastructure includes ECR repositories with lifecycle policies to manage image storage costs, OIDC-based IAM roles for GitHub Actions (no static credentials), S3 for build artifact storage, and EventBridge + SNS for deployment notifications. The GitHub Actions OIDC integration uses web identity federation - GitHub generates short-lived tokens, AWS validates them, and issues temporary credentials scoped to the specific repository and deployment role.
