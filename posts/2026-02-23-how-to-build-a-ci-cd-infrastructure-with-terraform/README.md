# How to Build a CI/CD Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, DevOps, AWS CodePipeline, Infrastructure Patterns, Automation

Description: A practical guide to building CI/CD infrastructure with Terraform using AWS CodePipeline, CodeBuild, and ECR for automated build, test, and deployment workflows.

---

Continuous integration and continuous deployment are the backbone of modern software delivery. But the CI/CD pipeline itself is infrastructure, and it needs to be managed with the same rigor as your application servers. When your CI/CD setup lives in a web UI that someone configured by hand, you have a single point of failure with no audit trail.

Building your CI/CD infrastructure with Terraform solves this. Every pipeline, build environment, and deployment stage is defined in code, versioned in Git, and reproducible. Let us build a complete CI/CD setup on AWS.

## Architecture Overview

We will build:

- AWS CodePipeline for orchestrating the pipeline stages
- AWS CodeBuild for building and testing code
- Amazon ECR for container image storage
- S3 for artifact storage
- IAM roles with least-privilege access
- SNS for notifications

## Artifact Storage

Every pipeline needs a place to store artifacts between stages:

```hcl
resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.project_name}-pipeline-artifacts-${var.account_id}"
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.pipeline.arn
    }
  }
}

# Clean up old artifacts
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "expire-old-artifacts"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}
```

## ECR Repository

For containerized applications, you need an ECR repository to store built images:

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-app"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.pipeline.arn
  }
}

# Lifecycle policy to keep only recent images
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## CodeBuild Projects

Build projects define the compute environment and build steps:

```hcl
# IAM role for CodeBuild
resource "aws_iam_role" "codebuild" {
  name = "${var.project_name}-codebuild-role"

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
}

# Build project for running tests
resource "aws_codebuild_project" "test" {
  name          = "${var.project_name}-test"
  description   = "Run unit and integration tests"
  build_timeout = 15
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = false
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-test.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = aws_cloudwatch_log_group.codebuild.name
      stream_name = "test"
    }
  }

  cache {
    type  = "S3"
    location = "${aws_s3_bucket.artifacts.id}/cache/test"
  }
}

# Build project for creating Docker images
resource "aws_codebuild_project" "build" {
  name          = "${var.project_name}-build"
  description   = "Build Docker image and push to ECR"
  build_timeout = 20
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true # Needed for Docker builds
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ECR_REPOSITORY"
      value = aws_ecr_repository.app.repository_url
    }

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = var.account_id
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-build.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = aws_cloudwatch_log_group.codebuild.name
      stream_name = "build"
    }
  }
}
```

## CodePipeline

The pipeline ties everything together with source, test, build, and deploy stages:

```hcl
resource "aws_codepipeline" "main" {
  name     = "${var.project_name}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.id
    type     = "S3"

    encryption_key {
      id   = aws_kms_key.pipeline.arn
      type = "KMS"
    }
  }

  # Stage 1: Pull source from GitHub
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
        FullRepositoryId = var.repository
        BranchName       = var.branch
      }
    }
  }

  # Stage 2: Run tests
  stage {
    name = "Test"

    action {
      name             = "UnitTests"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["test_output"]

      configuration = {
        ProjectName = aws_codebuild_project.test.name
      }
    }
  }

  # Stage 3: Build Docker image
  stage {
    name = "Build"

    action {
      name             = "BuildImage"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.build.name
      }
    }
  }

  # Stage 4: Manual approval before production deploy
  stage {
    name = "Approval"

    action {
      name     = "ManualApproval"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"

      configuration = {
        NotificationArn = aws_sns_topic.pipeline_notifications.arn
        CustomData      = "Please review the build artifacts before approving deployment."
      }
    }
  }

  # Stage 5: Deploy to ECS
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
      }
    }
  }
}
```

## Pipeline Notifications

Set up SNS notifications for pipeline state changes:

```hcl
resource "aws_sns_topic" "pipeline_notifications" {
  name = "${var.project_name}-pipeline-notifications"
}

resource "aws_codestarnotifications_notification_rule" "pipeline" {
  name        = "${var.project_name}-pipeline-events"
  resource    = aws_codepipeline.main.arn
  detail_type = "FULL"

  event_type_ids = [
    "codepipeline-pipeline-pipeline-execution-failed",
    "codepipeline-pipeline-pipeline-execution-succeeded",
    "codepipeline-pipeline-manual-approval-needed",
  ]

  target {
    address = aws_sns_topic.pipeline_notifications.arn
  }
}
```

## Multi-Environment Pipelines

For deploying to staging and production, use Terraform workspaces or variable files:

```hcl
# Create pipelines per environment
module "staging_pipeline" {
  source                  = "./modules/pipeline"
  project_name            = "${var.project_name}-staging"
  branch                  = "develop"
  ecs_cluster_name        = var.staging_cluster_name
  ecs_service_name        = var.staging_service_name
  codestar_connection_arn = var.codestar_connection_arn
  repository              = var.repository
}

module "production_pipeline" {
  source                  = "./modules/pipeline"
  project_name            = "${var.project_name}-production"
  branch                  = "main"
  ecs_cluster_name        = var.production_cluster_name
  ecs_service_name        = var.production_service_name
  codestar_connection_arn = var.codestar_connection_arn
  repository              = var.repository
}
```

For monitoring your pipeline health and deployment metrics, consider building a [monitoring and alerting stack with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

## Wrapping Up

Building CI/CD infrastructure with Terraform means your pipelines are reproducible, auditable, and version-controlled. The setup we covered gives you a complete pipeline from source to production with testing, image building, manual approval, and automated deployment. When you need a new pipeline for a new service, just instantiate the module with different parameters. That consistency is what makes infrastructure as code so powerful for DevOps teams.
