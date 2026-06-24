# How to Design a CI/CD Infrastructure Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, CI/CD, CodePipeline, AWS, Module, DevOps

Description: Learn how to design a reusable CI/CD infrastructure module for OpenTofu that creates CodePipeline pipelines, CodeBuild projects, and ECR repositories for container workloads.

## Introduction

A CI/CD infrastructure module standardizes how teams set up their build infrastructure. This example creates ECR repositories and a CodeBuild project for building and testing container workloads, with source and artifact settings that plug into CodePipeline-based workflows.

## variables.tf

```hcl
variable "pipeline_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "ecr_repositories" {
  description = "ECR repositories to create for this build stage"
  type        = list(string)
  default     = []
}

variable "build_spec" {
  description = "Relative path to the buildspec file or inline buildspec content"
  type        = string
  default     = "buildspec.yml"
}

variable "compute_type" {
  type    = string
  default = "BUILD_GENERAL1_SMALL"
}

variable "build_image" {
  type    = string
  default = "aws/codebuild/standard:7.0"
}

variable "s3_artifact_bucket" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

## main.tf

```hcl
locals {
  tags = merge({ Pipeline = var.pipeline_name, Environment = var.environment, ManagedBy = "OpenTofu" }, var.tags)
}

# ECR repositories for container images

resource "aws_ecr_repository" "repos" {
  for_each = toset(var.ecr_repositories)

  name                 = each.key
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.tags
}

# IAM role for CodeBuild
resource "aws_iam_role" "codebuild" {
  name = "${var.pipeline_name}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "codebuild" {
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetBucketAcl", "s3:GetBucketLocation"]
        Resource = data.aws_s3_bucket.artifacts.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"]
        Resource = "${data.aws_s3_bucket.artifacts.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:*"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_codebuild_project" "build" {
  name          = "${var.pipeline_name}-build"
  service_role  = aws_iam_role.codebuild.arn

  artifacts { type = "CODEPIPELINE" }

  environment {
    compute_type    = var.compute_type
    image           = var.build_image
    type            = "LINUX_CONTAINER"
    privileged_mode = length(var.ecr_repositories) > 0

    dynamic "environment_variable" {
      for_each = toset(var.ecr_repositories)
      content {
        name  = "ECR_REPO_${upper(replace(environment_variable.value, "/[^A-Za-z0-9_]/", "_"))}"
        value = aws_ecr_repository.repos[environment_variable.value].repository_url
      }
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = var.build_spec
  }

  tags = local.tags
}

data "aws_s3_bucket" "artifacts" {
  bucket = var.s3_artifact_bucket
}
```

## outputs.tf

```hcl
output "ecr_repository_urls" {
  value = { for name, repo in aws_ecr_repository.repos : name => repo.repository_url }
}

output "codebuild_project_name" { value = aws_codebuild_project.build.name }
output "codebuild_role_arn"     { value = aws_iam_role.codebuild.arn }
```

## Conclusion

This CI/CD module creates the build-stage plumbing for container workflows: ECR repositories with scan-on-push enabled, CodeBuild with dynamic ECR URL injection, and the IAM role needed for the build service. Teams get a standardized build setup that can be composed into a broader CodePipeline-based deployment workflow.
