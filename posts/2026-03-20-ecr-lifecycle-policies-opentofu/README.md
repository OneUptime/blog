# How to Configure ECR Lifecycle Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECR, Docker, Container Registry, Lifecycle Policy, Terraform

Description: Learn how to create Amazon ECR repositories and configure lifecycle policies with OpenTofu to automatically clean up old images and reduce storage costs.

---

Amazon ECR lifecycle policies automatically expire and delete container images based on rules you define. Without lifecycle policies, your repositories accumulate thousands of old images, driving up storage costs. This guide shows how to manage ECR repositories and lifecycle policies with OpenTofu.

---

## Create an ECR Repository

```hcl
# main.tf

resource "aws_ecr_repository" "app" {
  name                 = "my-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}
```

---

## Basic Lifecycle Policy - Keep Last N Images

```hcl
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

---

## Lifecycle Policy - Expire by Age

```hcl
resource "aws_ecr_lifecycle_policy" "old_images" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Expire dev images older than 90 days"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["dev-"]
          countType     = "sinceImagePushed"
          countUnit     = "days"
          countNumber   = 90
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Expire PR images older than 90 days"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["pr-"]
          countType     = "sinceImagePushed"
          countUnit     = "days"
          countNumber   = 90
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

---

## Production Pattern - Multi-Rule Policy

```hcl
resource "aws_ecr_lifecycle_policy" "production" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep latest 5 version-tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep latest 5 release images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["release-"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Expire all untagged images"
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
        rulePriority = 4
        description  = "Keep latest 20 images for everything else"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

---

## Multiple Repositories with for_each

```hcl
# variables.tf
variable "repositories" {
  default = {
    "frontend" = { keep_count = 10, scan_on_push = true }
    "backend"  = { keep_count = 15, scan_on_push = true }
    "worker"   = { keep_count = 5,  scan_on_push = false }
  }
}

# Create repositories
resource "aws_ecr_repository" "repos" {
  for_each = var.repositories

  name                 = each.key
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = each.value.scan_on_push
  }
}

# Apply lifecycle policies
resource "aws_ecr_lifecycle_policy" "repos" {
  for_each   = var.repositories
  repository = aws_ecr_repository.repos[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${each.value.keep_count} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = each.value.keep_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

---

## ECR Repository Policy (Access Control)

```hcl
data "aws_iam_policy_document" "ecr" {
  statement {
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::123456789012:role/ECSTaskRole"]
    }
    actions = [
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:BatchCheckLayerAvailability"
    ]
  }
}

resource "aws_ecr_repository_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy     = data.aws_iam_policy_document.ecr.json
}
```

---

## Apply and Verify

```bash
tofu init
tofu plan
tofu apply

# Verify lifecycle policy
aws ecr get-lifecycle-policy --repository-name my-app | jq '.lifecyclePolicyText | fromjson'

# Preview which images would be deleted
aws ecr start-lifecycle-policy-preview --repository-name my-app
aws ecr wait lifecycle-policy-preview-complete --repository-name my-app
aws ecr get-lifecycle-policy-preview --repository-name my-app
```

---

## Best Practices

1. **Always expire untagged images quickly** (1–7 days) - they accumulate rapidly from CI builds
2. **Use tag prefixes** to apply different retention rules to dev vs release images
3. **Test with preview** before applying to production repos
4. **Apply policies at repository creation** - retrofit is harder and risks deleting needed images
5. **Monitor storage costs** in Cost Explorer by ECR repository

---

## Conclusion

ECR lifecycle policies are essential for managing container image storage costs. Use OpenTofu to define policies as code, apply them consistently across multiple repositories, and use tag prefixes to implement environment-specific retention rules.

---

*Monitor your container infrastructure with [OneUptime](https://oneuptime.com) - uptime monitoring with alerting.*
