# How to Manage ECR Repositories with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECR, Terraform, Docker

Description: Practical guide to managing AWS Elastic Container Registry repositories with Terraform, covering lifecycle policies, scanning, replication, and cross-account access.

---

Amazon Elastic Container Registry (ECR) is where your Docker images live in AWS. It's tightly integrated with ECS, EKS, and Lambda, making it the natural choice for container image storage if you're running workloads on AWS. Managing ECR repositories through the console is fine for a handful of services, but once you've got dozens of microservices each with their own repository, Terraform is the way to go.

This guide covers creating repositories, setting up lifecycle policies to control costs, enabling vulnerability scanning, configuring cross-account access, and setting up replication.

## Basic Repository

Creating a repository is simple, but there are a few settings you should always configure.

This creates an ECR repository with image tag immutability and scan-on-push enabled:

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "my-app"
  image_tag_mutability = "IMMUTABLE"  # Prevents overwriting tags

  image_scanning_configuration {
    scan_on_push = true  # Automatically scan for vulnerabilities
  }

  encryption_configuration {
    encryption_type = "AES256"  # Or "KMS" for customer-managed keys
  }

  tags = {
    Service     = "my-app"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

**Image tag immutability** is worth using in production. With mutable tags (the default), pushing a new image with the tag `latest` overwrites the previous one. Immutable tags prevent this, forcing you to use unique tags like git commit SHAs. It makes deployments traceable and rollbacks reliable.

## Lifecycle Policies

Without lifecycle policies, ECR repositories grow forever. Old images pile up, and you end up paying for storage you don't need. Lifecycle policies automatically clean up images based on rules you define.

This lifecycle policy keeps the 20 most recent tagged images and deletes untagged images older than 1 day:

```hcl
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

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
        description  = "Keep only the 20 most recent tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v"]  # Only apply to tags starting with "v"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Keep only 50 images with any tag"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 50
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

A few notes on lifecycle policy evaluation:

- Rules are evaluated by `rulePriority` (lower number = higher priority)
- Once an image matches a rule, it's not evaluated against subsequent rules
- Untagged images are created when you push a new image with a tag that already exists (on mutable repos)
- Lifecycle policy evaluation happens asynchronously - images aren't deleted instantly

## Multiple Repositories with Shared Configuration

When you have many microservices, create repositories using `for_each` with consistent settings.

This creates repositories for multiple services with identical lifecycle policies:

```hcl
variable "services" {
  type = set(string)
  default = [
    "api-gateway",
    "user-service",
    "order-service",
    "payment-service",
    "notification-service",
    "auth-service"
  ]
}

resource "aws_ecr_repository" "services" {
  for_each = var.services

  name                 = each.value
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Service   = each.value
    ManagedBy = "terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each = var.services

  repository = aws_ecr_repository.services[each.value].name

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
        description  = "Keep last 30 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## Repository Policies for Cross-Account Access

In multi-account AWS setups, you often need to let other accounts pull images from a central ECR repository.

This repository policy allows a specific AWS account to pull images:

```hcl
resource "aws_ecr_repository_policy" "cross_account_pull" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::111111111111:root",  # Staging account
            "arn:aws:iam::222222222222:root",   # Production account
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

For the pulling account, you also need to grant the `ecr:GetAuthorizationToken` permission through IAM (not the repository policy):

```hcl
# In the pulling account's Terraform
resource "aws_iam_policy" "ecr_pull" {
  name = "ecr-cross-account-pull"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = "arn:aws:ecr:us-east-1:000000000000:repository/my-app"
      }
    ]
  })
}
```

## Replication

ECR supports automatic replication to other regions and accounts. This is useful for multi-region deployments or disaster recovery.

This configures ECR to replicate all repositories to eu-west-1 and to a DR account:

```hcl
resource "aws_ecr_replication_configuration" "main" {
  replication_configuration {
    rule {
      destination {
        region      = "eu-west-1"
        registry_id = data.aws_caller_identity.current.account_id
      }

      destination {
        region      = "us-east-1"
        registry_id = "999999999999"  # DR account
      }

      # Only replicate specific repositories
      repository_filter {
        filter      = "production-"  # Repos starting with "production-"
        filter_type = "PREFIX_MATCH"
      }
    }
  }
}
```

## Enhanced Scanning

ECR offers two scanning modes: basic (free, uses Clair) and enhanced (paid, uses Inspector). Enhanced scanning provides continuous monitoring, not just scan-on-push.

This enables enhanced scanning for all repositories:

```hcl
resource "aws_ecr_registry_scanning_configuration" "main" {
  scan_type = "ENHANCED"

  rule {
    scan_frequency = "CONTINUOUS_SCAN"

    repository_filter {
      filter      = "*"
      filter_type = "WILDCARD"
    }
  }
}
```

## Pull-Through Cache

Pull-through cache repositories let ECR act as a caching proxy for upstream registries like Docker Hub. This avoids Docker Hub rate limits and speeds up pulls.

This creates a pull-through cache rule for Docker Hub:

```hcl
resource "aws_ecr_pull_through_cache_rule" "docker_hub" {
  ecr_repository_prefix = "docker-hub"
  upstream_registry_url = "registry-1.docker.io"
}
```

After creating this, you can pull `docker-hub/library/nginx:latest` from your ECR, and it will transparently cache the image from Docker Hub.

## Outputs

Export repository URLs for use in other modules and CI/CD pipelines:

```hcl
output "repository_urls" {
  value = {
    for name, repo in aws_ecr_repository.services : name => repo.repository_url
  }
  description = "Map of service name to ECR repository URL"
}

output "app_repository_url" {
  value       = aws_ecr_repository.app.repository_url
  description = "Repository URL for the main app"
}
```

## Using ECR in CI/CD

Here's a quick reference for authenticating and pushing to ECR from your build pipeline:

```bash
# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t my-app:latest .
docker tag my-app:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

For a complete CI/CD setup that builds and pushes Docker images, check out our guide on [creating CodeBuild projects with Terraform](https://oneuptime.com/blog/post/create-codebuild-projects-terraform/view).

## Wrapping Up

ECR repositories are straightforward to create but easy to neglect. The two most important things to get right are lifecycle policies (to keep costs under control) and repository policies (for cross-account access). Always enable scan-on-push at minimum, and consider enhanced scanning for production workloads. With the `for_each` pattern, managing repositories for dozens of microservices stays clean and consistent.
