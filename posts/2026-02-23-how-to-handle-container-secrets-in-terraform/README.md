# How to Handle Container Secrets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Containers, Secret, Security, AWS, Kubernetes

Description: Learn how to securely manage container secrets in Terraform using secret management services, encryption, and best practices for protecting sensitive configuration data.

---

Secrets management is one of the most critical aspects of container security. Database passwords, API keys, TLS certificates, and other sensitive data must be available to your containers at runtime without being exposed in source code, environment variables in plain text, or Terraform state files. Terraform integrates with multiple secret management services to provide secure, auditable secret handling for containerized applications.

This guide covers the best practices and patterns for handling container secrets in Terraform, from basic approaches to enterprise-grade implementations.

## The Problem with Hardcoded Secrets

Never put secrets directly in Terraform code:

```hcl
# DO NOT do this - secrets in plain text
resource "aws_ecs_task_definition" "bad_example" {
  # ...
  container_definitions = jsonencode([
    {
      name = "app"
      environment = [
        {
          name  = "DB_PASSWORD"
          value = "super-secret-password"  # Stored in state file!
        }
      ]
    }
  ])
}
```

This approach exposes secrets in version control, Terraform state files, and plan outputs.

## AWS Secrets Manager with ECS

### Creating and Referencing Secrets

```hcl
# Create a secret in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "app/database-credentials"
  description             = "Database credentials for the application"
  recovery_window_in_days = 7

  # Encrypt with a custom KMS key
  kms_key_id = aws_kms_key.secrets.arn

  tags = {
    Application = "my-app"
    Environment = var.environment
  }
}

# Set the secret value
resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  # Store structured secrets as JSON
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = "myapp"
  })
}

# KMS key for encrypting secrets
resource "aws_kms_key" "secrets" {
  description             = "KMS key for application secrets"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

# ECS task definition referencing secrets
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:v1.0"
      essential = true

      # Non-sensitive environment variables
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "LOG_LEVEL"
          value = "info"
        }
      ]

      # Secrets injected from Secrets Manager
      secrets = [
        {
          # Reference the entire secret
          name      = "DB_CREDENTIALS"
          valueFrom = aws_secretsmanager_secret.db_credentials.arn
        },
        {
          # Reference a specific JSON key within the secret
          name      = "DB_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:password::"
        },
        {
          # Reference a specific JSON key
          name      = "DB_USERNAME"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:username::"
        },
        {
          # Reference from SSM Parameter Store
          name      = "API_KEY"
          valueFrom = aws_ssm_parameter.api_key.arn
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

# IAM policy for ECS to read secrets
resource "aws_iam_role_policy" "ecs_secrets_access" {
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
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [
          aws_kms_key.secrets.arn
        ]
      }
    ]
  })
}
```

## Kubernetes Secrets

### Creating and Using Kubernetes Secrets

```hcl
# Kubernetes secret for database credentials
resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = "default"

    # Annotations for external-secrets or sealed-secrets
    annotations = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }

  data = {
    username = var.db_username
    password = var.db_password
    host     = var.db_host
  }

  type = "Opaque"
}

# TLS secret for certificates
resource "kubernetes_secret" "tls" {
  metadata {
    name      = "app-tls"
    namespace = "default"
  }

  data = {
    "tls.crt" = file("${path.module}/certs/tls.crt")
    "tls.key" = file("${path.module}/certs/tls.key")
  }

  type = "kubernetes.io/tls"
}

# Docker registry credentials
resource "kubernetes_secret" "registry_credentials" {
  metadata {
    name      = "registry-credentials"
    namespace = "default"
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        "myregistry.example.com" = {
          auth = base64encode("${var.registry_username}:${var.registry_password}")
        }
      }
    })
  }
}

# Deployment using secrets
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
        # Use the registry secret for image pull
        image_pull_secrets {
          name = kubernetes_secret.registry_credentials.metadata[0].name
        }

        container {
          name  = "app"
          image = "myregistry.example.com/app:v1.0"

          # Mount individual secret keys as environment variables
          env {
            name = "DB_USERNAME"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "username"
              }
            }
          }

          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "password"
              }
            }
          }

          # Mount secrets as files
          volume_mount {
            name       = "tls-certs"
            mount_path = "/etc/tls"
            read_only  = true
          }

          volume_mount {
            name       = "db-credentials"
            mount_path = "/etc/secrets/db"
            read_only  = true
          }
        }

        # Volume from TLS secret
        volume {
          name = "tls-certs"
          secret {
            secret_name = kubernetes_secret.tls.metadata[0].name
          }
        }

        # Volume from credentials secret
        volume {
          name = "db-credentials"
          secret {
            secret_name  = kubernetes_secret.db_credentials.metadata[0].name
            default_mode = "0400"  # Read-only for owner
          }
        }
      }
    }
  }
}
```

## HashiCorp Vault Integration

### Using Vault Provider with Terraform

```hcl
# Configure Vault provider
provider "vault" {
  address = "https://vault.example.com:8200"
}

# Read a secret from Vault
data "vault_generic_secret" "db_credentials" {
  path = "secret/data/app/database"
}

# Use Vault secrets in ECS task definition
resource "aws_ecs_task_definition" "vault_app" {
  family                   = "vault-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "myregistry.example.com/app:v1.0"

      environment = [
        {
          name  = "DB_HOST"
          value = data.vault_generic_secret.db_credentials.data["host"]
        }
      ]

      secrets = [
        {
          # Store the Vault secret in SSM and reference it
          name      = "DB_PASSWORD"
          valueFrom = aws_ssm_parameter.db_password_from_vault.arn
        }
      ]
    }
  ])
}

# Bridge Vault to SSM Parameter Store for ECS
resource "aws_ssm_parameter" "db_password_from_vault" {
  name  = "/app/db-password"
  type  = "SecureString"
  value = data.vault_generic_secret.db_credentials.data["password"]

  lifecycle {
    ignore_changes = [value]
  }
}
```

## Protecting Secrets in Terraform State

### Using sensitive variables

```hcl
# Mark variables as sensitive
variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true  # Prevents display in plan/apply output
}

variable "api_key" {
  description = "API key for external service"
  type        = string
  sensitive   = true
}

# Mark outputs as sensitive
output "secret_arn" {
  description = "ARN of the secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = false  # ARN is not sensitive
}
```

### Encrypting State Backend

```hcl
# S3 backend with encryption for state files
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true           # Enable server-side encryption
    kms_key_id     = "arn:aws:kms:us-east-1:123456789:key/abc-123"
    dynamodb_table = "terraform-locks"
  }
}
```

## Secret Rotation

```hcl
# Enable automatic rotation for Secrets Manager
resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# Lambda function for secret rotation
resource "aws_lambda_function" "secret_rotation" {
  filename         = data.archive_file.rotation_lambda.output_path
  function_name    = "secret-rotation-handler"
  role             = aws_iam_role.rotation_lambda.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.rotation_lambda.output_base64sha256
  timeout          = 60

  environment {
    variables = {
      SECRET_ARN = aws_secretsmanager_secret.db_credentials.arn
    }
  }
}
```

## Monitoring with OneUptime

Secret management issues can cause application outages. Expired secrets, failed rotations, or misconfigured access policies all lead to downtime. OneUptime monitors your application health and can detect when secret-related authentication failures occur. Visit [OneUptime](https://oneuptime.com) to set up monitoring that catches secret management issues early.

## Conclusion

Handling container secrets in Terraform requires a multi-layered approach. Store secrets in dedicated services like AWS Secrets Manager, SSM Parameter Store, or HashiCorp Vault rather than in Terraform code. Reference secrets from container definitions using ARN-based lookups instead of embedding values. Encrypt your Terraform state files since they will contain sensitive data. Mark variables and outputs as sensitive to prevent accidental exposure in plan output. Enable secret rotation to reduce the risk of compromised credentials. By following these patterns, you maintain strong security while keeping your infrastructure fully managed through Terraform.

For related topics, see [How to Handle Container Environment Variables in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-container-environment-variables-in-terraform/view) and [How to Create Container Logging Configurations in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-logging-configurations-in-terraform/view).
