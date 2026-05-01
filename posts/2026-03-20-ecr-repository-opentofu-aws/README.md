# How to Create an ECR Repository with OpenTofu on AWS - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, ECR, Docker, Container

Description: Learn how to create AWS Elastic Container Registry repositories with lifecycle policies, image scanning, and cross-account access using OpenTofu.

## Introduction

Amazon Elastic Container Registry (ECR) is a fully managed Docker container registry. This guide covers creating ECR repositories with lifecycle policies, vulnerability scanning, and repository policies using OpenTofu.

## Step 1: Configure the Provider

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Step 2: Create an ECR Repository

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "my-app"
  image_tag_mutability = "IMMUTABLE"  # Prevent overwriting tags

  # Enable image vulnerability scanning on push
  image_scanning_configuration {
    scan_on_push = true
  }

  # KMS encryption
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = {
    Environment = "production"
    Service     = "my-app"
  }
}
```

## Step 3: Add Lifecycle Policy

```hcl
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        # Keep only last 10 tagged production images
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod-"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      },
      {
        # Remove untagged images after 1 day
        rulePriority = 2
        description  = "Remove untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      }
    ]
  })
}
```

## Step 4: Set Repository Policy for Cross-Account Access

```hcl
resource "aws_ecr_repository_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CrossAccountPull"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.consumer_account_id}:root"
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
```

The consuming IAM principal still needs an IAM policy that allows `ecr:GetAuthorizationToken` so it can authenticate before pulling images.

## Step 5: Create a Public ECR Repository

```hcl
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"  # ECR Public is only available in us-east-1
}

resource "aws_ecrpublic_repository" "public" {
  provider        = aws.us_east_1
  repository_name = "my-public-app"

  catalog_data {
    about_text        = "My open-source application"
    architectures     = ["x86-64", "ARM 64"]
    operating_systems = ["Linux"]
  }
}
```

## Step 6: Outputs

```hcl
output "repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "registry_id" {
  value = aws_ecr_repository.app.registry_id
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply

# Login to the private ECR registry

ECR_REGISTRY=$(tofu output -raw repository_url | cut -d/ -f1)

aws ecr get-login-password --region "$(printf '%s' "$ECR_REGISTRY" | cut -d. -f4)" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"
```

## Conclusion

You have successfully created an ECR repository using OpenTofu with immutable tags, vulnerability scanning, lifecycle policies, and cross-account access. Lifecycle policies are essential for cost management, automatically removing old images. Use immutable tags to ensure image integrity and prevent accidental overwrites.
