# How to Create Terraform Modules for CI/CD Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, CI/CD, DevOps, CodePipeline, Infrastructure as Code

Description: Build reusable Terraform modules for CI/CD infrastructure including CodePipeline, CodeBuild, ECR repositories, and deployment pipelines with practical examples.

---

CI/CD infrastructure is one of those things that every team needs but nobody wants to set up from scratch every time. A Terraform module for CI/CD pipelines lets you spin up new deployment pipelines in minutes instead of hours, with consistent security settings and best practices baked in. This post walks through building modules for the most common CI/CD components.

## ECR Repository Module

Every container-based CI/CD pipeline starts with a container registry. This module creates an ECR repository with lifecycle policies and scanning enabled.

```hcl
# modules/ecr/variables.tf
variable "name" {
  description = "Name of the ECR repository"
  type        = string
}

variable "image_tag_mutability" {
  description = "Tag mutability setting (MUTABLE or IMMUTABLE)"
  type        = string
  default     = "IMMUTABLE"
}

variable "max_image_count" {
  description = "Maximum number of images to retain"
  type        = number
  default     = 30
}

variable "scan_on_push" {
  description = "Whether to scan images on push"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/ecr/main.tf

resource "aws_ecr_repository" "this" {
  name                 = var.name
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.tags, {
    Name = var.name
  })
}

# Lifecycle policy to clean up old images
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove untagged images after 1 day"
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
        rulePriority = 2
        description  = "Keep only the last ${var.max_image_count} tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v"]
          countType   = "imageCountMoreThan"
          countNumber = var.max_image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

output "repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.this.repository_url
}

output "repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.this.arn
}
```

## CodeBuild Project Module

CodeBuild handles the actual build and test steps. This module creates a project with sensible defaults.

```hcl
# modules/codebuild/variables.tf
variable "name" {
  description = "Name of the CodeBuild project"
  type        = string
}

variable "description" {
  description = "Description of the build project"
  type        = string
  default     = ""
}

variable "build_timeout" {
  description = "Build timeout in minutes"
  type        = number
  default     = 30
}

variable "compute_type" {
  description = "CodeBuild compute type"
  type        = string
  default     = "BUILD_GENERAL1_MEDIUM"
}

variable "image" {
  description = "Docker image for the build environment"
  type        = string
  default     = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
}

variable "buildspec" {
  description = "Path to the buildspec file or inline buildspec"
  type        = string
  default     = "buildspec.yml"
}

variable "environment_variables" {
  description = "Environment variables for the build"
  type = list(object({
    name  = string
    value = string
    type  = optional(string, "PLAINTEXT")
  }))
  default = []
}

variable "vpc_config" {
  description = "VPC configuration for builds that need network access"
  type = object({
    vpc_id             = string
    subnets            = list(string)
    security_group_ids = list(string)
  })
  default = null
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/codebuild/main.tf

# IAM role for CodeBuild
resource "aws_iam_role" "codebuild" {
  name = "${var.name}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# Permissions for CodeBuild
resource "aws_iam_role_policy" "codebuild" {
  name = "${var.name}-codebuild-policy"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = ["*"]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = ["*"]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetBucketAcl",
          "s3:GetBucketLocation"
        ]
        Resource = ["*"]
      }
    ]
  })
}

# The CodeBuild project
resource "aws_codebuild_project" "this" {
  name          = var.name
  description   = var.description
  build_timeout = var.build_timeout
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = var.compute_type
    image                       = var.image
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true  # Required for Docker builds

    dynamic "environment_variable" {
      for_each = var.environment_variables
      content {
        name  = environment_variable.value.name
        value = environment_variable.value.value
        type  = environment_variable.value.type
      }
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = var.buildspec
  }

  # Optional VPC configuration for builds that need database access
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      vpc_id             = vpc_config.value.vpc_id
      subnets            = vpc_config.value.subnets
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${var.name}"
      stream_name = "build"
    }
  }

  tags = var.tags
}

# Log group for build logs
resource "aws_cloudwatch_log_group" "codebuild" {
  name              = "/codebuild/${var.name}"
  retention_in_days = 30
  tags              = var.tags
}
```

## Full Pipeline Module

This module creates a complete CI/CD pipeline using CodePipeline.

```hcl
# modules/pipeline/main.tf

# S3 bucket for pipeline artifacts
resource "aws_s3_bucket" "artifacts" {
  bucket_prefix = "${var.name}-pipeline-"
  force_destroy = true
  tags          = var.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# IAM role for CodePipeline
resource "aws_iam_role" "pipeline" {
  name = "${var.name}-pipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# The pipeline itself
resource "aws_codepipeline" "this" {
  name     = var.name
  role_arn = aws_iam_role.pipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  # Source stage - pull from GitHub
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = var.repository_id
        BranchName       = var.branch_name
      }
    }
  }

  # Build stage
  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = var.codebuild_project_name
      }
    }
  }

  # Deploy stage
  stage {
    name = "Deploy"

    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        ClusterName = var.ecs_cluster_name
        ServiceName = var.ecs_service_name
        FileName    = "imagedefinitions.json"
      }
    }
  }

  tags = var.tags
}
```

## Composing the Full CI/CD Stack

```hcl
# Root module - complete CI/CD for a microservice

module "ecr" {
  source = "./modules/ecr"
  name   = "myapp-api"
}

module "codebuild" {
  source = "./modules/codebuild"

  name        = "myapp-api-build"
  description = "Build and test the API service"

  environment_variables = [
    {
      name  = "ECR_REPOSITORY_URL"
      value = module.ecr.repository_url
    },
    {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
  ]
}

module "pipeline" {
  source = "./modules/pipeline"

  name                     = "myapp-api"
  codestar_connection_arn  = var.codestar_connection_arn
  repository_id            = "myorg/myapp-api"
  branch_name              = "main"
  codebuild_project_name   = module.codebuild.project_name
  ecs_cluster_name         = module.compute.cluster_name
  ecs_service_name         = module.compute.service_name
}
```

## Conclusion

CI/CD modules reduce the friction of setting up new pipelines and ensure every service gets the same security controls and best practices. Start with ECR and CodeBuild modules, then compose them into full pipeline modules. The investment in building these modules pays off quickly when you have multiple services that each need their own deployment pipeline.

For related patterns, see our posts on [how to create Terraform modules for Kubernetes addons](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-kubernetes-addons/view) and [how to create Terraform modules for monitoring and alerting](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-monitoring-and-alerting/view).
