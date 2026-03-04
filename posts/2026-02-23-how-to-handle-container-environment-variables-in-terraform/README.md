# How to Handle Container Environment Variables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Containers, Environment Variables, ECS, Kubernetes, Configuration

Description: Learn how to manage container environment variables in Terraform across ECS, Kubernetes, and other platforms with best practices for secrets and configuration.

---

Environment variables are the primary mechanism for configuring containerized applications. They control everything from database connection strings and API endpoints to feature flags and logging levels. Managing environment variables in Terraform requires balancing between keeping configuration in code and protecting sensitive values. This guide covers how to handle container environment variables effectively across different platforms using Terraform.

In this guide, we will explore patterns for defining, organizing, and securing environment variables for containers managed through Terraform.

## Basic Environment Variables in ECS

The simplest approach defines environment variables directly in the task definition:

```hcl
# ECS task definition with environment variables
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "myregistry.example.com/app:v1.0"

      # Plain text environment variables
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "8080"
        },
        {
          name  = "LOG_LEVEL"
          value = "info"
        },
        {
          name  = "API_BASE_URL"
          value = "https://api.example.com"
        }
      ]

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

## Using Terraform Variables for Environment Configuration

Organize environment variables using Terraform variables and locals:

```hcl
# Variables for different configuration categories
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "app_config" {
  description = "Application configuration settings"
  type        = map(string)
  default = {
    LOG_LEVEL        = "info"
    CACHE_TTL        = "3600"
    MAX_CONNECTIONS  = "100"
    ENABLE_METRICS   = "true"
  }
}

variable "feature_flags" {
  description = "Feature flag settings"
  type        = map(string)
  default = {
    FEATURE_NEW_UI       = "true"
    FEATURE_DARK_MODE    = "false"
    FEATURE_BETA_ACCESS  = "false"
  }
}

# Combine all environment variables
locals {
  # Base environment variables present in all environments
  base_env = {
    NODE_ENV     = var.environment
    PORT         = "8080"
    SERVICE_NAME = "my-app"
  }

  # Environment-specific overrides
  env_overrides = {
    production = {
      LOG_LEVEL = "warn"
      DEBUG     = "false"
    }
    staging = {
      LOG_LEVEL = "debug"
      DEBUG     = "true"
    }
    development = {
      LOG_LEVEL = "trace"
      DEBUG     = "true"
    }
  }

  # Merge all configuration sources
  all_env_vars = merge(
    local.base_env,
    var.app_config,
    var.feature_flags,
    lookup(local.env_overrides, var.environment, {})
  )

  # Convert map to list of name/value pairs for ECS
  ecs_environment = [
    for key, value in local.all_env_vars : {
      name  = key
      value = value
    }
  ]
}

# ECS task definition using the merged environment variables
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name        = "app"
      image       = "myregistry.example.com/app:v1.0"
      environment = local.ecs_environment

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

## Secrets from AWS Secrets Manager and SSM

For sensitive values, reference secrets instead of embedding them:

```hcl
# Store secrets in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "app/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

# Store configuration in SSM Parameter Store
resource "aws_ssm_parameter" "api_key" {
  name  = "/app/api-key"
  type  = "SecureString"
  value = var.api_key
}

# ECS task definition with secrets
resource "aws_ecs_task_definition" "app_with_secrets" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "myregistry.example.com/app:v1.0"

      # Plain text environment variables
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.main.address
        },
        {
          name  = "DB_PORT"
          value = "5432"
        }
      ]

      # Secrets injected from Secrets Manager and SSM
      secrets = [
        {
          # From Secrets Manager
          name      = "DB_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        },
        {
          # From SSM Parameter Store
          name      = "API_KEY"
          valueFrom = aws_ssm_parameter.api_key.arn
        },
        {
          # Specific JSON key from a Secrets Manager secret
          name      = "DB_USERNAME"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:username::"
        }
      ]

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}

# IAM policy allowing ECS to read secrets
resource "aws_iam_role_policy" "ecs_secrets" {
  name = "ecs-secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn,
          aws_secretsmanager_secret.db_credentials.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters"
        ]
        Resource = [
          aws_ssm_parameter.api_key.arn
        ]
      }
    ]
  })
}
```

## Kubernetes Environment Variables

### ConfigMaps and Secrets

```hcl
# ConfigMap for non-sensitive configuration
resource "kubernetes_config_map" "app_config" {
  metadata {
    name = "app-config"
  }

  data = {
    NODE_ENV        = var.environment
    LOG_LEVEL       = "info"
    API_BASE_URL    = "https://api.example.com"
    CACHE_TTL       = "3600"
    MAX_CONNECTIONS = "100"
  }
}

# Secret for sensitive configuration
resource "kubernetes_secret" "app_secrets" {
  metadata {
    name = "app-secrets"
  }

  data = {
    DB_PASSWORD  = var.db_password
    API_KEY      = var.api_key
    JWT_SECRET   = var.jwt_secret
  }

  type = "Opaque"
}

# Deployment using ConfigMap and Secret references
resource "kubernetes_deployment" "app" {
  metadata {
    name = "my-app"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.example.com/app:v1.0"

          # Individual environment variable from ConfigMap
          env {
            name = "NODE_ENV"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app_config.metadata[0].name
                key  = "NODE_ENV"
              }
            }
          }

          # Individual environment variable from Secret
          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secrets.metadata[0].name
                key  = "DB_PASSWORD"
              }
            }
          }

          # Load all keys from ConfigMap as environment variables
          env_from {
            config_map_ref {
              name = kubernetes_config_map.app_config.metadata[0].name
            }
          }

          # Load all keys from Secret as environment variables
          env_from {
            secret_ref {
              name = kubernetes_secret.app_secrets.metadata[0].name
            }
            # Optional prefix for all secret keys
            prefix = ""
          }

          # Environment variable from pod metadata
          env {
            name = "POD_NAME"
            value_from {
              field_ref {
                field_path = "metadata.name"
              }
            }
          }

          env {
            name = "POD_IP"
            value_from {
              field_ref {
                field_path = "status.podIP"
              }
            }
          }

          # Resource-based environment variable
          env {
            name = "MEMORY_LIMIT"
            value_from {
              resource_field_ref {
                container_name = "app"
                resource       = "limits.memory"
              }
            }
          }
        }
      }
    }
  }
}
```

## Environment Variables for Azure Container Apps

```hcl
# Azure Container App with environment variables
resource "azurerm_container_app" "api" {
  name                         = "api-service"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  # Define secrets at the app level
  secret {
    name  = "db-connection-string"
    value = var.db_connection_string
  }

  secret {
    name  = "api-key"
    value = var.api_key
  }

  template {
    container {
      name   = "api"
      image  = "myregistry.azurecr.io/api:v1.0"
      cpu    = 0.5
      memory = "1Gi"

      # Plain environment variables
      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = "Production"
      }

      env {
        name  = "LOG_LEVEL"
        value = "Information"
      }

      # Secret references
      env {
        name        = "ConnectionStrings__Default"
        secret_name = "db-connection-string"
      }

      env {
        name        = "ApiSettings__ApiKey"
        secret_name = "api-key"
      }
    }

    min_replicas = 1
    max_replicas = 10
  }
}
```

## Template Files for Complex Configurations

For complex environment configurations, use template files:

```hcl
# Template file for ECS container definitions
data "template_file" "container_definitions" {
  template = file("${path.module}/templates/container-definitions.json.tpl")

  vars = {
    app_image      = "${aws_ecr_repository.app.repository_url}:${var.app_image_tag}"
    environment    = var.environment
    log_group      = aws_cloudwatch_log_group.app.name
    region         = var.region
    db_host        = aws_db_instance.main.address
    db_secret_arn  = aws_secretsmanager_secret.db_password.arn
    api_key_arn    = aws_ssm_parameter.api_key.arn
  }
}
```

## Outputs

```hcl
output "config_map_name" {
  description = "Name of the Kubernetes ConfigMap"
  value       = kubernetes_config_map.app_config.metadata[0].name
}

output "environment_variable_count" {
  description = "Number of environment variables configured"
  value       = length(local.all_env_vars)
}
```

## Monitoring with OneUptime

Misconfigured environment variables are a common cause of application failures after deployments. OneUptime helps you detect configuration-related issues by monitoring your application health immediately after deployments. When environment variables are missing or incorrect, OneUptime alerts you before users are affected. Visit [OneUptime](https://oneuptime.com) for comprehensive application monitoring.

## Conclusion

Handling container environment variables in Terraform is about organization, security, and consistency. Use Terraform variables and locals to merge configuration from multiple sources. Store sensitive values in secret management services like AWS Secrets Manager, SSM Parameter Store, or Kubernetes Secrets, and reference them from container definitions rather than embedding them. Environment-specific overrides keep your configuration DRY while allowing each environment to have its own settings. By managing environment variables through Terraform, you get version control, audit trails, and consistent configuration across all your deployments.

For related topics, see [How to Handle Container Secrets in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-container-secrets-in-terraform/view) and [How to Create Container Health Check Configurations in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-health-check-configurations-in-terraform/view).
