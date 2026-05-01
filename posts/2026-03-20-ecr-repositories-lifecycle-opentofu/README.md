# How to Create ECR Repositories with Lifecycle Policies in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECR, Container Registry, Lifecycle Policies, Cost Optimization, Infrastructure as Code

Description: Learn how to create Amazon ECR repositories with lifecycle policies and image scanning using OpenTofu to manage container image storage costs and security posture.

## Introduction

Amazon ECR stores Docker container images securely with encryption at rest, image vulnerability scanning, and lifecycle policies to automatically remove old images. Without lifecycle policies, images accumulate indefinitely-lifecycle policies help control storage costs by keeping only the most recent N images per tag pattern or removing untagged images automatically.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with ECR permissions

## Step 1: Create ECR Repository

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}/app"
  image_tag_mutability = "IMMUTABLE"  # Prevent tag overwrites for reproducibility

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = {
    Name        = "${var.project_name}/app"
    Environment = var.environment
  }
}

# Configure scan on push at the registry level (current AWS approach)
resource "aws_ecr_registry_scanning_configuration" "app" {
  scan_type = "BASIC"

  rule {
    scan_frequency = "SCAN_ON_PUSH"

    repository_filter {
      filter      = aws_ecr_repository.app.name
      filter_type = "WILDCARD"
    }
  }
}
```

## Step 2: Configure Lifecycle Policy

```hcl
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      # Keep the 10 most recent "main" branch images
      {
        rulePriority = 1
        description  = "Keep last 10 main branch images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["main-"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      },
      # Keep the 5 most recent release images
      {
        rulePriority = 2
        description  = "Keep last 5 release images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = { type = "expire" }
      },
      # Remove untagged images after 1 day
      {
        rulePriority = 10
        description  = "Remove untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      # Remove images not already covered by higher-priority rules after 90 days
      {
        rulePriority = 20
        description  = "Remove images not already covered after 90 days"
        selection = {
          tagStatus   = "any"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 90
        }
        action = { type = "expire" }
      }
    ]
  })
}
```

## Step 3: Repository Policy for Cross-Account Access

```hcl
# Allow other accounts to pull images from this repository.
# The pulling principal still needs ecr:GetAuthorizationToken via IAM.

resource "aws_ecr_repository_policy" "cross_account" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCrossAccountPull"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${var.prod_account_id}:root",
            "arn:aws:iam::${var.staging_account_id}:root"
          ]
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

## Step 4: IAM Policy for CI/CD Push Access

```hcl
resource "aws_iam_policy" "ecr_push" {
  name = "${var.project_name}-ecr-push"

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
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = aws_ecr_repository.app.arn
      }
    ]
  })
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Login to ECR and push an image
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

docker build -t my-project/app:v1.0.0 .
docker tag my-project/app:v1.0.0 \
  ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/my-project/app:v1.0.0
docker push \
  ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/my-project/app:v1.0.0
```

## Conclusion

ECR lifecycle policies are essential cost controls-set them up before your first image push, not after. Use `IMMUTABLE` tags to prevent accidental overwrites of production image tags. Cross-account repository policies allow staging and production accounts to pull images from this repository, while separate IAM policies control which CI/CD principals can push. Pulling principals still need `ecr:GetAuthorizationToken` via IAM. Enable scan on push and monitor scan findings to catch vulnerabilities in your images before deployment.
