# How to Create CodeBuild Projects with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeBuild, Terraform, CI/CD

Description: Learn how to provision AWS CodeBuild projects with Terraform, including build environments, buildspec files, caching, VPC access, and Docker image builds.

---

AWS CodeBuild is a managed build service that compiles source code, runs tests, and produces deployable artifacts. It's the build engine behind CodePipeline and can also run standalone. The nice thing about CodeBuild is you don't manage any build servers - it spins up a fresh container for each build and tears it down when it's done.

In this guide, we'll set up CodeBuild projects in Terraform for common scenarios: building Docker images, running tests, and deploying artifacts.

## Basic CodeBuild Project

Every CodeBuild project needs three things: an IAM service role, a source configuration, and an environment definition.

This creates a basic CodeBuild project that builds from a GitHub repository:

```hcl
resource "aws_codebuild_project" "main" {
  name          = "my-app-build"
  description   = "Build and test my-app"
  build_timeout = 15  # minutes
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "NO_ARTIFACTS"  # Use "S3" or "CODEPIPELINE" if you need build output
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    # Environment variables available during the build
    environment_variable {
      name  = "APP_ENV"
      value = "production"
    }

    environment_variable {
      name  = "DB_PASSWORD"
      value = "production/database/password"
      type  = "SECRETS_MANAGER"  # Pulls from Secrets Manager at build time
    }
  }

  source {
    type            = "GITHUB"
    location        = "https://github.com/my-org/my-app.git"
    git_clone_depth = 1
    buildspec       = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/my-app"
      stream_name = "build"
    }
  }

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}
```

## IAM Role for CodeBuild

CodeBuild needs permissions to write logs, access artifacts, pull secrets, and interact with other AWS services during the build.

This role provides the common permissions CodeBuild needs:

```hcl
resource "aws_iam_role" "codebuild" {
  name = "codebuild-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "codebuild.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "codebuild" {
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
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetBucketAcl",
          "s3:GetBucketLocation"
        ]
        Resource = [
          "${aws_s3_bucket.artifacts.arn}",
          "${aws_s3_bucket.artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:production/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:GetAuthorizationToken",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_s3_bucket" "artifacts" {
  bucket = "my-app-build-artifacts"
}
```

## Building Docker Images

Building and pushing Docker images to ECR is one of the most common CodeBuild use cases. You need privileged mode enabled for Docker-in-Docker to work.

This CodeBuild project builds Docker images and pushes them to ECR:

```hcl
resource "aws_codebuild_project" "docker_build" {
  name          = "my-app-docker-build"
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
    privileged_mode             = true  # Required for Docker builds
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }

    environment_variable {
      name  = "ECR_REPO_URL"
      value = aws_ecr_repository.app.repository_url
    }

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = data.aws_region.current.name
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-docker.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/codebuild/docker-build"
    }
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
```

And here's the matching buildspec file that goes in your repository:

```yaml
# buildspec-docker.yml - builds and pushes a Docker image to ECR
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - IMAGE_TAG=${COMMIT_HASH:=latest}
  build:
    commands:
      - echo Building Docker image...
      - docker build -t $ECR_REPO_URL:latest .
      - docker tag $ECR_REPO_URL:latest $ECR_REPO_URL:$IMAGE_TAG
  post_build:
    commands:
      - echo Pushing Docker image...
      - docker push $ECR_REPO_URL:latest
      - docker push $ECR_REPO_URL:$IMAGE_TAG
      # Generate imagedefinitions.json for ECS deployment
      - printf '[{"name":"app","imageUri":"%s"}]' $ECR_REPO_URL:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
```

## Build Caching

Builds run on fresh containers every time, which means dependencies get downloaded from scratch. Caching speeds things up significantly.

This configures an S3 cache for build dependencies:

```hcl
resource "aws_s3_bucket" "build_cache" {
  bucket = "my-app-build-cache"
}

resource "aws_codebuild_project" "cached_build" {
  name         = "my-app-cached-build"
  service_role = aws_iam_role.codebuild.arn

  # ... source and environment config ...

  cache {
    type     = "S3"
    location = aws_s3_bucket.build_cache.bucket
  }

  # For Docker layer caching, use LOCAL cache type
  # cache {
  #   type  = "LOCAL"
  #   modes = ["LOCAL_DOCKER_LAYER_CACHE", "LOCAL_SOURCE_CACHE"]
  # }

  source {
    type     = "GITHUB"
    location = "https://github.com/my-org/my-app.git"
  }

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type = "BUILD_GENERAL1_MEDIUM"
    image        = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type         = "LINUX_CONTAINER"
  }
}
```

Reference the cache in your buildspec:

```yaml
version: 0.2

phases:
  install:
    commands:
      - npm ci  # Install dependencies

cache:
  paths:
    - 'node_modules/**/*'  # Cache node_modules between builds
```

## VPC Access

If your build needs to access resources inside a VPC (like a database for integration tests), configure VPC settings.

This gives the CodeBuild project access to resources in your VPC:

```hcl
resource "aws_codebuild_project" "vpc_build" {
  name         = "my-app-integration-tests"
  service_role = aws_iam_role.codebuild.arn

  vpc_config {
    vpc_id = var.vpc_id

    subnets = var.private_subnet_ids

    security_group_ids = [
      aws_security_group.codebuild.id
    ]
  }

  # ... rest of config ...

  source {
    type     = "GITHUB"
    location = "https://github.com/my-org/my-app.git"
  }

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type = "BUILD_GENERAL1_MEDIUM"
    image        = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type         = "LINUX_CONTAINER"
  }
}

resource "aws_security_group" "codebuild" {
  name   = "codebuild-sg"
  vpc_id = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

The CodeBuild IAM role also needs VPC permissions when using VPC config:

```hcl
# Add this to the codebuild role policy
{
  Effect = "Allow"
  Action = [
    "ec2:CreateNetworkInterface",
    "ec2:DescribeDhcpOptions",
    "ec2:DescribeNetworkInterfaces",
    "ec2:DeleteNetworkInterface",
    "ec2:DescribeSubnets",
    "ec2:DescribeSecurityGroups",
    "ec2:DescribeVpcs",
    "ec2:CreateNetworkInterfacePermission"
  ]
  Resource = "*"
}
```

## Webhook Triggers

For standalone CodeBuild projects (not triggered by CodePipeline), set up webhooks to automatically build on push or pull request.

This creates a webhook that triggers builds on pull requests to the main branch:

```hcl
resource "aws_codebuild_webhook" "pr_builds" {
  project_name = aws_codebuild_project.main.name

  filter_group {
    filter {
      type    = "EVENT"
      pattern = "PULL_REQUEST_CREATED,PULL_REQUEST_UPDATED"
    }

    filter {
      type    = "BASE_REF"
      pattern = "refs/heads/main"
    }
  }
}
```

## Multiple Build Environments

Use the `for_each` pattern to create similar projects for different environments:

```hcl
variable "environments" {
  type = map(object({
    compute_type = string
    timeout      = number
  }))
  default = {
    staging = {
      compute_type = "BUILD_GENERAL1_SMALL"
      timeout      = 10
    }
    production = {
      compute_type = "BUILD_GENERAL1_MEDIUM"
      timeout      = 20
    }
  }
}

resource "aws_codebuild_project" "per_env" {
  for_each = var.environments

  name          = "my-app-${each.key}"
  build_timeout = each.value.timeout
  service_role  = aws_iam_role.codebuild.arn

  environment {
    compute_type = each.value.compute_type
    image        = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type         = "LINUX_CONTAINER"

    environment_variable {
      name  = "APP_ENV"
      value = each.key
    }
  }

  source {
    type     = "GITHUB"
    location = "https://github.com/my-org/my-app.git"
  }

  artifacts {
    type = "NO_ARTIFACTS"
  }
}
```

For details on connecting CodeBuild to a full CI/CD pipeline, check out our guide on [creating CodePipeline with Terraform](https://oneuptime.com/blog/post/create-codepipeline-terraform/view).

## Wrapping Up

CodeBuild projects in Terraform are straightforward once you've got the IAM role sorted out. The key decisions are compute type (which affects build speed and cost), whether you need privileged mode for Docker builds, and whether VPC access is required. Combine caching with the right compute tier to keep builds fast without burning through your budget. The configurations in this guide cover the patterns you'll use most often in real-world projects.
