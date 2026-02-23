# How to Build a Container Registry Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Container Registry, ECR, Docker, DevOps, Infrastructure as Code

Description: Learn how to build a container registry infrastructure using Terraform with AWS ECR including image scanning, lifecycle policies, cross-account access, and replication.

---

A container registry is a fundamental piece of any container-based infrastructure. It stores your Docker images, scans them for vulnerabilities, and distributes them to your deployment targets. While setting up a single registry is straightforward, building a production-grade registry infrastructure with proper lifecycle management, security scanning, cross-account access, and replication takes more thought.

In this guide, we will build a complete container registry infrastructure on AWS using Terraform with ECR (Elastic Container Registry).

## Registry Architecture

A production container registry setup includes:

- Multiple ECR repositories organized by team and service
- Image scanning for vulnerabilities
- Lifecycle policies to manage storage costs
- Cross-account access for multi-account setups
- Replication across regions for disaster recovery
- Pull-through cache for external images

## Repository Module

First, let's create a reusable module for ECR repositories that encodes all our best practices.

```hcl
# modules/ecr-repository/main.tf - Reusable ECR repository module
variable "name" {
  type        = string
  description = "Repository name (e.g., team/service)"
}

variable "image_tag_mutability" {
  type        = string
  default     = "IMMUTABLE"
  description = "Tag mutability setting - IMMUTABLE prevents overwriting tags"
}

variable "max_image_count" {
  type        = number
  default     = 30
  description = "Maximum number of images to keep"
}

variable "scan_on_push" {
  type        = bool
  default     = true
  description = "Enable vulnerability scanning on push"
}

variable "cross_account_ids" {
  type        = list(string)
  default     = []
  description = "AWS account IDs that can pull from this repository"
}

resource "aws_ecr_repository" "this" {
  name                 = var.name
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Repository = var.name
    ManagedBy  = "terraform"
  }
}

# Lifecycle policy to manage image count and clean up untagged images
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        # Remove untagged images after 1 day
        rulePriority = 1
        description  = "Remove untagged images"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      },
      {
        # Keep only the last N tagged images
        rulePriority = 2
        description  = "Keep last ${var.max_image_count} images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v", "release", "sha"]
          countType   = "imageCountMoreThan"
          countNumber = var.max_image_count
        }
        action = {
          type = "expire"
        }
      },
      {
        # Remove dev/feature branch images after 14 days
        rulePriority = 3
        description  = "Expire dev images after 14 days"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["dev-", "feature-", "pr-"]
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Cross-account access policy
resource "aws_ecr_repository_policy" "cross_account" {
  count      = length(var.cross_account_ids) > 0 ? 1 : 0
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CrossAccountPull"
        Effect = "Allow"
        Principal = {
          AWS = [for id in var.cross_account_ids : "arn:aws:iam::${id}:root"]
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}

output "repository_url" {
  value = aws_ecr_repository.this.repository_url
}

output "repository_arn" {
  value = aws_ecr_repository.this.arn
}
```

## Creating Repositories for Multiple Services

Use the module to create repositories for all your services.

```hcl
# repositories.tf - All service repositories
locals {
  repositories = {
    "platform/api-gateway" = {
      max_image_count   = 50
      cross_account_ids = var.production_account_ids
    }
    "platform/auth-service" = {
      max_image_count   = 30
      cross_account_ids = var.production_account_ids
    }
    "team-a/order-service" = {
      max_image_count   = 30
      cross_account_ids = var.production_account_ids
    }
    "team-a/payment-service" = {
      max_image_count   = 30
      cross_account_ids = var.production_account_ids
    }
    "team-b/user-service" = {
      max_image_count   = 30
      cross_account_ids = var.production_account_ids
    }
    "shared/nginx" = {
      max_image_count   = 10
      cross_account_ids = var.all_account_ids
    }
    "shared/envoy" = {
      max_image_count   = 10
      cross_account_ids = var.all_account_ids
    }
  }
}

module "ecr_repository" {
  source   = "./modules/ecr-repository"
  for_each = local.repositories

  name              = each.key
  max_image_count   = each.value.max_image_count
  cross_account_ids = each.value.cross_account_ids
}
```

## Pull-Through Cache for External Images

Instead of pulling from Docker Hub directly, use ECR pull-through cache to avoid rate limits and improve pull speeds.

```hcl
# pull-through-cache.tf - Cache external registries
resource "aws_ecr_pull_through_cache_rule" "dockerhub" {
  ecr_repository_prefix = "docker-hub"
  upstream_registry_url = "registry-1.docker.io"

  credential_arn = aws_secretsmanager_secret.dockerhub_credentials.arn
}

resource "aws_ecr_pull_through_cache_rule" "github" {
  ecr_repository_prefix = "github"
  upstream_registry_url = "ghcr.io"
}

resource "aws_ecr_pull_through_cache_rule" "quay" {
  ecr_repository_prefix = "quay"
  upstream_registry_url = "quay.io"
}

# Docker Hub credentials for authenticated pulls
resource "aws_secretsmanager_secret" "dockerhub_credentials" {
  name = "ecr-pullthroughcache/docker-hub"
}

resource "aws_secretsmanager_secret_version" "dockerhub_credentials" {
  secret_id = aws_secretsmanager_secret.dockerhub_credentials.id
  secret_string = jsonencode({
    username    = var.dockerhub_username
    accessToken = var.dockerhub_token
  })
}
```

## Cross-Region Replication

For disaster recovery and reduced pull latency, replicate images to other regions.

```hcl
# replication.tf - Cross-region replication
resource "aws_ecr_replication_configuration" "main" {
  replication_configuration {
    rule {
      destination {
        region      = var.dr_region
        registry_id = data.aws_caller_identity.current.account_id
      }

      # Only replicate production images
      repository_filter {
        filter      = "platform/"
        filter_type = "PREFIX_MATCH"
      }

      repository_filter {
        filter      = "shared/"
        filter_type = "PREFIX_MATCH"
      }
    }
  }
}
```

## Enhanced Scanning

ECR enhanced scanning uses Amazon Inspector to continuously scan images for both OS and programming language vulnerabilities.

```hcl
# scanning.tf - Enhanced vulnerability scanning
resource "aws_ecr_registry_scanning_configuration" "main" {
  scan_type = "ENHANCED"

  rule {
    scan_frequency = "CONTINUOUS_SCAN"

    repository_filter {
      filter      = "*"
      filter_type = "WILDCARD"
    }
  }
}

# SNS topic for scan findings
resource "aws_sns_topic" "vulnerability_findings" {
  name = "ecr-vulnerability-findings"
}

# EventBridge rule to alert on critical findings
resource "aws_cloudwatch_event_rule" "critical_findings" {
  name        = "ecr-critical-vulnerability-findings"
  description = "Alert on critical vulnerability findings in ECR images"

  event_pattern = jsonencode({
    source      = ["aws.inspector2"]
    detail-type = ["Inspector2 Finding"]
    detail = {
      severity = ["CRITICAL", "HIGH"]
      resources = [{
        type = ["AWS_ECR_CONTAINER_IMAGE"]
      }]
    }
  })
}

resource "aws_cloudwatch_event_target" "vulnerability_alert" {
  rule      = aws_cloudwatch_event_rule.critical_findings.name
  target_id = "sns-alert"
  arn       = aws_sns_topic.vulnerability_findings.arn
}
```

## Registry Policy

Control who can create repositories and manage images at the registry level.

```hcl
# registry-policy.tf - Registry-level access control
resource "aws_ecr_registry_policy" "main" {
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCrossAccountReplication"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.management_account_id}:root"
        }
        Action = [
          "ecr:CreateRepository",
          "ecr:ReplicateImage"
        ]
        Resource = "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/*"
      }
    ]
  })
}
```

## CI/CD Integration

Set up IAM roles for your CI/CD pipelines to push images to ECR.

```hcl
# cicd.tf - CI/CD push access
resource "aws_iam_role" "ci_push" {
  name = "ecr-ci-push-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.github_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/*:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ci_push" {
  name = "ecr-push-policy"
  role = aws_iam_role.ci_push.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
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
        Resource = "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/*"
      }
    ]
  })
}
```

## Summary

A well-built container registry infrastructure is about more than just storing images. Lifecycle policies keep costs under control. Image scanning catches vulnerabilities before they reach production. Cross-account access supports multi-account architectures. And pull-through caching reduces your dependency on external registries.

The key to scaling is the reusable module approach. Define your standards once, and every repository automatically gets lifecycle policies, scanning, and access controls. Teams can create new repositories through pull requests without worrying about the underlying configuration.

For monitoring the health of your container infrastructure and alerting on build failures or deployment issues, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) provides visibility across your entire container pipeline.
