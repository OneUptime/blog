# How to Create ECR Lifecycle Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECR, Lifecycle Policy, Infrastructure as Code

Description: Learn how to create AWS ECR lifecycle policies with OpenTofu to automatically clean up old container images and manage registry storage costs.

ECR lifecycle policies automatically delete old images based on age, count, or tag patterns. Without them, registries accumulate thousands of untagged layers and old images. Managing policies in OpenTofu ensures consistent cleanup rules across all repositories.

## Basic Lifecycle Policy

```hcl
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      # Keep the most recent 30 images regardless of tag status
      {
        rulePriority = 1
        description  = "Keep last 30 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## Multi-Rule Policy

```hcl
resource "aws_ecr_lifecycle_policy" "services" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      # Rule 1: Keep the latest 10 images for pinned and version tags
      {
        rulePriority = 1
        description  = "Keep last 10 pinned/versioned images"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["latest", "stable", "v*.*.*"]
          countType      = "imageCountMoreThan"
          countNumber    = 10  # Keep last 10 versioned images
        }
        action = {
          type = "expire"
        }
      },
      # Rule 2: Keep only 5 images tagged as release candidates
      {
        rulePriority = 2
        description  = "Keep 5 release candidates"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["rc-*"]
          countType      = "imageCountMoreThan"
          countNumber    = 5
        }
        action = {
          type = "expire"
        }
      },
      # Rule 3: Delete untagged images after 7 days
      {
        rulePriority = 3
        description  = "Expire untagged images after 7 days"
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
      # Rule 4: Expire any remaining images after 90 days
      {
        rulePriority = 4
        description  = "Expire any image after 90 days"
        selection = {
          tagStatus   = "any"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 90
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## Shared Policy Module

```hcl
# Reusable lifecycle policy as a local

locals {
  standard_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPatternList = ["*"]
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 1 day"
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

# Apply same policy to all repositories
resource "aws_ecr_lifecycle_policy" "all_services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name
  policy     = local.standard_lifecycle_policy
}
```

## Scan Results and Notifications

```hcl
# Alert on critical scan findings
resource "aws_cloudwatch_event_rule" "ecr_scan_findings" {
  name        = "ecr-critical-findings"
  description = "Alert on ECR image scan critical findings"

  event_pattern = jsonencode({
    source      = ["aws.ecr"]
    detail-type = ["ECR Image Scan"]
    detail = {
      finding-severity-counts = {
        CRITICAL = [{ numeric = [">", 0] }]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "scan_alert" {
  rule      = aws_cloudwatch_event_rule.ecr_scan_findings.name
  target_id = "scan-alert-sns"
  arn       = aws_sns_topic.security_alerts.arn
}
```

## Conclusion

ECR lifecycle policies in OpenTofu prevent unlimited registry growth by automatically expiring old images. Always delete untagged images quickly (1-7 days) as they're usually push artifacts, keep a bounded set of tagged images (10-30), and protect version tags like `v*.*.*` with higher count limits. Apply the same policy across all repositories using for_each to ensure consistent cleanup behavior.
