# How to Configure ECR Lifecycle Policies for Image Cleanup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECR, Docker, Cost Optimization, Container Registry

Description: Learn how to set up ECR lifecycle policies to automatically clean up old container images, reduce storage costs, and keep your repositories organized.

---

Every time your CI/CD pipeline runs, it pushes a new container image to ECR. After a few months of active development, you might have hundreds or thousands of images sitting in your repository, most of which you'll never use again. Each of those images costs money - ECR charges $0.10 per GB per month. Across multiple services and repositories, that adds up.

ECR lifecycle policies automate image cleanup. You define rules about which images to keep, and ECR deletes the rest. No cron jobs, no Lambda functions, just a policy on the repository.

## How Lifecycle Policies Work

A lifecycle policy is a set of rules that ECR evaluates periodically. Each rule targets images based on their tag, age, or count, and the action is always "expire" (delete). Rules are evaluated by priority number - lower numbers run first.

When ECR evaluates a policy:
1. It processes rules in priority order
2. Each rule selects a set of images
3. Selected images are marked for deletion
4. Images matched by a higher-priority rule are protected from lower-priority rules

## Basic Cleanup Policy

Let's start with a policy that keeps the last 20 tagged images and deletes untagged images older than 1 day.

```bash
aws ecr put-lifecycle-policy \
  --repository-name my-web-app \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Keep last 20 tagged images",
        "selection": {
          "tagStatus": "tagged",
          "tagPrefixList": ["v"],
          "countType": "imageCountMoreThan",
          "countNumber": 20
        },
        "action": {
          "type": "expire"
        }
      },
      {
        "rulePriority": 2,
        "description": "Delete untagged images after 1 day",
        "selection": {
          "tagStatus": "untagged",
          "countType": "sinceImagePushed",
          "countUnit": "days",
          "countNumber": 1
        },
        "action": {
          "type": "expire"
        }
      }
    ]
  }'
```

In Terraform:

```hcl
resource "aws_ecr_lifecycle_policy" "web_app" {
  repository = aws_ecr_repository.web_app.name

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
        description  = "Delete untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## Rule Selection Types

ECR lifecycle rules can select images in two ways:

**Count-based** (`imageCountMoreThan`): Keep only N images, delete the rest (oldest first). This is the most common approach.

```json
{
  "selection": {
    "tagStatus": "tagged",
    "tagPrefixList": ["v"],
    "countType": "imageCountMoreThan",
    "countNumber": 50
  }
}
```

**Age-based** (`sinceImagePushed`): Delete images older than N days.

```json
{
  "selection": {
    "tagStatus": "any",
    "countType": "sinceImagePushed",
    "countUnit": "days",
    "countNumber": 90
  }
}
```

## Tag-Based Rules

You can target images by their tag prefix. This lets you treat different image categories differently.

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 5 release images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["release-"],
        "countType": "imageCountMoreThan",
        "countNumber": 5
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Keep last 30 dev images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["dev-"],
        "countType": "imageCountMoreThan",
        "countNumber": 30
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 3,
      "description": "Keep last 10 feature branch images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["feature-"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 10,
      "description": "Remove any untagged images older than 3 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 3
      },
      "action": { "type": "expire" }
    }
  ]
}
```

## Comprehensive Production Policy

Here's a policy I'd recommend for production repositories that balances cost savings with safety.

```hcl
resource "aws_ecr_lifecycle_policy" "production" {
  repository = aws_ecr_repository.production.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 100 production release images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 100
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep last 50 commit SHA tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 50
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 3
        description  = "Delete feature branch images after 14 days"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["feature-", "pr-"]
          countType     = "sinceImagePushed"
          countUnit     = "days"
          countNumber   = 14
        }
        action = { type = "expire" }
      },
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
      }
    ]
  })
}
```

## Testing Policies Before Applying

Before applying a lifecycle policy, you can preview which images would be affected.

```bash
# Preview the policy's effect without actually deleting anything
aws ecr get-lifecycle-policy-preview \
  --repository-name my-web-app

# Start a preview
aws ecr start-lifecycle-policy-preview \
  --repository-name my-web-app \
  --lifecycle-policy-text file://lifecycle-policy.json

# Check preview results
aws ecr get-lifecycle-policy-preview \
  --repository-name my-web-app \
  --query 'previewResults[*].{tag:imageTags,pushed:imagePushedAt,action:action.type}' \
  --output table
```

This is incredibly useful when you're setting up policies for existing repositories with many images. You can see exactly which images would be deleted before committing.

## Understanding Rule Priority

Rule priority determines the order of evaluation. Lower numbers run first. Here's the key thing to understand: once a rule matches an image, that image is excluded from subsequent rules.

Example:

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 5 release images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["release-"],
        "countType": "imageCountMoreThan",
        "countNumber": 5
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Keep any tagged image pushed in last 30 days",
      "selection": {
        "tagStatus": "any",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 30
      },
      "action": { "type": "expire" }
    }
  ]
}
```

Rule 1 keeps the 5 most recent release images and marks older ones for expiry. Rule 2 then operates on the remaining images (excluding those already handled by rule 1) and expires anything older than 30 days.

## Applying Policies Across All Repositories

If you want consistent lifecycle policies across all your repositories, use a Terraform module or loop.

```hcl
locals {
  repositories = [
    "api-service",
    "web-frontend",
    "worker-service",
    "data-processor",
    "auth-service",
  ]

  standard_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 tagged images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 30
        }
        action = { type = "expire" }
      }
    ]
  })
}

resource "aws_ecr_repository" "services" {
  for_each = toset(local.repositories)
  name     = each.value

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = toset(local.repositories)
  repository = aws_ecr_repository.services[each.value].name
  policy     = local.standard_lifecycle_policy
}
```

## Cost Impact

Let's look at real numbers. Say you have 10 repositories with an average of 500 images each, and each image is around 200 MB.

Without lifecycle policies:
- 10 repos x 500 images x 200 MB = 1 TB
- Cost: 1,000 GB x $0.10/month = $100/month

With lifecycle policies keeping 30 images per repo:
- 10 repos x 30 images x 200 MB = 60 GB
- Cost: 60 GB x $0.10/month = $6/month

That's a 94% reduction in ECR storage costs. Not life-changing amounts of money, but it adds up across a large organization.

## Common Gotchas

**Images in use by ECS**: ECR won't delete an image that's referenced by a running ECS task definition. However, it CAN delete images referenced by old task definition revisions that aren't currently deployed. If you need to roll back to an old version, make sure your retention policy keeps enough images.

**Untagged images from multi-tag pushes**: When you push a new image with a tag that already exists (if mutability is enabled), the old image becomes untagged. Your lifecycle policy should clean these up.

**Rule ordering matters**: Put more specific rules first (lower priority numbers). A broad `tagStatus: "any"` rule should have a high priority number.

Lifecycle policies are a set-it-and-forget-it optimization. Spend 15 minutes configuring them when you create a repository, and you'll never worry about ECR storage costs again. For managing the images themselves, check out our post on [managing ECS container images in ECR](https://oneuptime.com/blog/post/2026-02-12-manage-ecs-container-images-ecr/view).
