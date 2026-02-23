# How to Create Container Registries with Lifecycle Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Docker, ECR, ACR, Containers, Registry

Description: Learn how to create container registries with lifecycle policies using Terraform to automatically clean up old images and manage storage costs effectively.

---

Container registries accumulate images rapidly as CI/CD pipelines push new builds. Without lifecycle policies, your registry storage grows unbounded, leading to increased costs and difficulty finding relevant images. Lifecycle policies automate the cleanup of old, untagged, or unused images based on rules you define. Terraform provides a clean way to manage both the registries and their lifecycle policies as code.

This guide covers creating container registries with lifecycle policies across AWS ECR, Azure ACR, and Google Artifact Registry using Terraform.

## AWS ECR with Lifecycle Policies

### Creating the ECR Repository

```hcl
# ECR repository with image scanning and encryption
resource "aws_ecr_repository" "app" {
  name                 = "my-application"
  image_tag_mutability = "IMMUTABLE"  # Prevent tag overwriting

  # Enable image scanning on push
  image_scanning_configuration {
    scan_on_push = true
  }

  # Encrypt with KMS
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}

# KMS key for ECR encryption
resource "aws_kms_key" "ecr" {
  description             = "KMS key for ECR image encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}
```

### Defining Lifecycle Policies

```hcl
# Lifecycle policy for the ECR repository
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        # Rule 1: Remove untagged images after 1 day
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
        # Rule 2: Keep only the last 10 dev images
        rulePriority = 2
        description  = "Keep only last 10 dev images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["dev-", "feature-"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        # Rule 3: Keep only the last 50 staging images
        rulePriority = 3
        description  = "Keep only last 50 staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["staging-"]
          countType     = "imageCountMoreThan"
          countNumber   = 50
        }
        action = {
          type = "expire"
        }
      },
      {
        # Rule 4: Remove production images older than 90 days
        # but keep the last 20 regardless of age
        rulePriority = 4
        description  = "Remove prod images older than 90 days"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "release-"]
          countType     = "sinceImagePushed"
          countUnit     = "days"
          countNumber   = 90
        }
        action = {
          type = "expire"
        }
      },
      {
        # Rule 5: Catch-all - remove any remaining images older than 180 days
        rulePriority = 10
        description  = "Remove all images older than 180 days"
        selection = {
          tagStatus   = "any"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 180
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

### Multiple Repositories with Shared Policies

```hcl
# Define repository configurations
locals {
  repositories = {
    "api-service" = {
      mutability   = "IMMUTABLE"
      scan_on_push = true
    }
    "web-frontend" = {
      mutability   = "IMMUTABLE"
      scan_on_push = true
    }
    "worker-service" = {
      mutability   = "MUTABLE"
      scan_on_push = false
    }
    "cron-jobs" = {
      mutability   = "IMMUTABLE"
      scan_on_push = true
    }
  }

  # Shared lifecycle policy
  standard_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove untagged images"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep last 30 images"
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

# Create repositories dynamically
resource "aws_ecr_repository" "services" {
  for_each             = local.repositories
  name                 = each.key
  image_tag_mutability = each.value.mutability

  image_scanning_configuration {
    scan_on_push = each.value.scan_on_push
  }

  tags = {
    Service = each.key
  }
}

# Apply lifecycle policy to all repositories
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = local.repositories
  repository = aws_ecr_repository.services[each.key].name
  policy     = local.standard_lifecycle_policy
}
```

## Azure Container Registry with Retention Policies

```hcl
# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = "myappregistry"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Premium"  # Premium required for retention policies
  admin_enabled       = false

  # Geo-replication for high availability
  georeplications {
    location = "West US"
    tags = {
      Region = "secondary"
    }
  }

  # Network rules
  network_rule_set {
    default_action = "Deny"

    ip_rule {
      action   = "Allow"
      ip_range = var.allowed_cidr
    }

    virtual_network_rule {
      action    = "Allow"
      subnet_id = azurerm_subnet.aks.id
    }
  }

  # Retention policy for untagged manifests
  retention_policy {
    days    = 7
    enabled = true
  }

  # Trust policy for content trust
  trust_policy {
    enabled = true
  }

  tags = {
    Environment = "production"
  }
}

# Scheduled task to purge old images (ACR Tasks)
resource "azurerm_container_registry_task" "purge" {
  name                  = "purge-old-images"
  container_registry_id = azurerm_container_registry.main.id

  platform {
    os = "Linux"
  }

  encoded_step {
    task_content = base64encode(<<-YAML
      version: v1.1.0
      steps:
        - cmd: acr purge --filter 'api-service:.*'
                --ago 30d --untagged --keep 10
          disableWorkingDirectoryOverride: true
          timeout: 3600
        - cmd: acr purge --filter 'web-frontend:.*'
                --ago 30d --untagged --keep 10
          disableWorkingDirectoryOverride: true
          timeout: 3600
    YAML
    )
  }

  # Run daily at 2 AM UTC
  timer_trigger {
    name     = "daily-purge"
    schedule = "0 2 * * *"
    enabled  = true
  }
}
```

## Google Artifact Registry with Cleanup Policies

```hcl
# Google Artifact Registry repository
resource "google_artifact_registry_repository" "main" {
  location      = var.region
  repository_id = "my-app-images"
  description   = "Docker repository for application images"
  format        = "DOCKER"

  # Cleanup policies for automatic image management
  cleanup_policies {
    id     = "delete-old-dev-images"
    action = "DELETE"

    condition {
      tag_state  = "TAGGED"
      tag_prefixes = ["dev-", "feature-"]
      older_than = "604800s"  # 7 days in seconds
    }
  }

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "86400s"  # 1 day
    }
  }

  cleanup_policies {
    id     = "keep-production-releases"
    action = "KEEP"

    condition {
      tag_state    = "TAGGED"
      tag_prefixes = ["v", "release-"]
    }

    most_recent_versions {
      keep_count = 20
    }
  }

  # Docker-specific configuration
  docker_config {
    immutable_tags = true
  }
}
```

## ECR Repository Permissions

```hcl
# Repository policy for cross-account access
resource "aws_ecr_repository_policy" "cross_account" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${var.staging_account_id}:root",
            "arn:aws:iam::${var.production_account_id}:root"
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

## Outputs

```hcl
output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_arn" {
  description = "ECR repository ARN"
  value       = aws_ecr_repository.app.arn
}

output "acr_login_server" {
  description = "Azure Container Registry login server"
  value       = azurerm_container_registry.main.login_server
}
```

## Monitoring with OneUptime

Container registries are critical infrastructure components. If a registry becomes unavailable, your deployments fail. OneUptime can monitor registry endpoint health, track storage utilization trends, and alert when lifecycle policy executions fail. Visit [OneUptime](https://oneuptime.com) to add registry monitoring to your observability stack.

## Conclusion

Container registries with lifecycle policies managed through Terraform keep your infrastructure clean and cost-effective. AWS ECR offers flexible rule-based policies with tag prefix matching and age-based expiration. Azure ACR provides retention policies and ACR Tasks for scheduled purging. Google Artifact Registry includes built-in cleanup policies with keep and delete actions. By defining these policies in Terraform, you ensure every registry across every environment has consistent cleanup rules, preventing the storage bloat that comes with unmanaged container registries.

For more container management, see [How to Handle Container Image Updates in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-container-image-updates-in-terraform/view) and [How to Create Container Logging Configurations in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-logging-configurations-in-terraform/view).
