# How to Create an ECR Repository with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECR, Docker, Container Registry

Description: Learn how to create an AWS ECR repository with OpenTofu including lifecycle policies, cross-account access, image scanning, and pull-through cache configuration.

## Introduction

Amazon Elastic Container Registry (ECR) stores and distributes Docker images. OpenTofu manages ECR repositories with lifecycle policies, encryption, image scanning, and cross-account access permissions.

## ECR Repository

```hcl
resource "aws_ecr_repository" "app" {
  name                 = var.repository_name
  image_tag_mutability = "IMMUTABLE"  # Prevent tag overwrites in production

  image_scanning_configuration {
    scan_on_push = true  # Automatically scan images for vulnerabilities
  }

  encryption_configuration {
    encryption_type = "KMS"  # Uses the AWS managed KMS key for Amazon ECR by default
  }

  tags = {
    Name        = var.repository_name
    Environment = var.environment
  }
}
```

## Lifecycle Policy

```hcl
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the last 30 tagged release images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images older than 7 days"
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

## Cross-Account Access Policy

```hcl
data "aws_iam_policy_document" "ecr_cross_account" {
  statement {
    sid    = "AllowCrossAccountPull"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [for id in var.allowed_account_ids : "arn:aws:iam::${id}:root"]
    }
    actions = [
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:BatchCheckLayerAvailability",
    ]
  }
}

resource "aws_ecr_repository_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy     = data.aws_iam_policy_document.ecr_cross_account.json
}
```

The IAM principal in each allowed account also needs `ecr:GetAuthorizationToken` in an IAM policy before it can authenticate to the registry and pull images.

## Outputs

```hcl
output "repository_url" { value = aws_ecr_repository.app.repository_url }
output "repository_arn" { value = aws_ecr_repository.app.arn }
```

## Pushing Images

After creating the repository, push images using the AWS CLI:

```bash
# Authenticate Docker with ECR
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
REPOSITORY_NAME=myapp  # Must match var.repository_name

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
    "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# Build and push
docker build -t "$REPOSITORY_NAME:v1.0.0" .
docker tag "$REPOSITORY_NAME:v1.0.0" \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:v1.0.0"
docker push \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:v1.0.0"
```

## Conclusion

Use `IMMUTABLE` tags in production to prevent accidental overwrites of released images. Enable scan-on-push and act on critical/high vulnerability findings before deployment. Lifecycle policies keep storage costs in check by expiring old untagged images automatically.
