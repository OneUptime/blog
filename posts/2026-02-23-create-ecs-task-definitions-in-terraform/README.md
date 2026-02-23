# How to Create ECS Task Definitions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Task Definitions, Containers, Fargate

Description: A detailed guide to creating ECS task definitions with Terraform, covering container definitions, resource allocation, logging, secrets management, and multi-container tasks.

---

A task definition is the blueprint for your containers on ECS. It defines which container images to run, how much CPU and memory to allocate, what ports to expose, where to send logs, and how to inject environment variables and secrets. Every time ECS runs a task, it uses a task definition to know what to do.

Getting the task definition right is important because mistakes here cascade into everything else - services that will not start, containers that run out of memory, or applications that cannot reach their dependencies. This guide covers creating task definitions in Terraform for Fargate, including single and multi-container tasks, secrets management, health checks, and resource sizing.

## Basic Task Definition

```hcl
# ECS task definition
resource "aws_ecs_task_definition" "app" {
  family                   = "myapp"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"  # Required for Fargate

  # Task-level resources
  cpu    = 512   # 0.5 vCPU (256, 512, 1024, 2048, 4096)
  memory = 1024  # 1 GB

  # IAM roles
  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  # Container definitions
  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]

      # Logging
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      }

      # Environment variables
      environment = [
        { name = "PORT", value = "8080" },
        { name = "NODE_ENV", value = var.environment },
        { name = "LOG_LEVEL", value = "info" }
      ]

      # Secrets from SSM Parameter Store or Secrets Manager
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_ssm_parameter.db_url.arn
        },
        {
          name      = "API_KEY"
          valueFrom = "${aws_secretsmanager_secret.api_key.arn}:api_key::"
        }
      ]

      # Health check
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "myapp-task-definition"
  }
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/myapp"
  retention_in_days = 30

  tags = {
    Name = "myapp-ecs-logs"
  }
}
```

## Understanding CPU and Memory Values

Fargate has specific valid CPU/memory combinations:

| CPU (units) | Memory (MB) options |
|---|---|
| 256 (0.25 vCPU) | 512, 1024, 2048 |
| 512 (0.5 vCPU) | 1024, 2048, 3072, 4096 |
| 1024 (1 vCPU) | 2048, 3072, 4096, 5120, 6144, 7168, 8192 |
| 2048 (2 vCPU) | 4096 through 16384 (in 1024 increments) |
| 4096 (4 vCPU) | 8192 through 30720 (in 1024 increments) |

```hcl
# Variables for task sizing
variable "task_cpu" {
  description = "Task CPU units"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Task memory in MB"
  type        = number
  default     = 1024
}
```

## Multi-Container Task Definition

A task can run multiple containers. Common patterns include an application container with a sidecar for logging, proxying, or metrics:

```hcl
resource "aws_ecs_task_definition" "multi_container" {
  family                   = "myapp-multi"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    # Main application container
    {
      name      = "app"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true
      cpu       = 768   # Allocate most CPU to the app
      memory    = 1536  # And most memory

      portMappings = [{
        containerPort = 8080
        hostPort      = 8080
        protocol      = "tcp"
      }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      }

      environment = [
        { name = "PORT", value = "8080" }
      ]

      # Dependency on the sidecar
      dependsOn = [{
        containerName = "datadog-agent"
        condition     = "START"
      }]
    },

    # Datadog agent sidecar
    {
      name      = "datadog-agent"
      image     = "public.ecr.aws/datadog/agent:latest"
      essential = false  # Don't kill the task if the sidecar crashes
      cpu       = 256
      memory    = 512

      environment = [
        { name = "DD_API_KEY", value = "" },
        { name = "ECS_FARGATE", value = "true" },
        { name = "DD_APM_ENABLED", value = "true" }
      ]

      secrets = [
        {
          name      = "DD_API_KEY"
          valueFrom = aws_ssm_parameter.dd_api_key.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "datadog"
        }
      }
    }
  ])

  tags = {
    Name = "myapp-multi-container"
  }
}
```

## Secrets Management

There are two ways to inject secrets: SSM Parameter Store and Secrets Manager.

```hcl
# SSM Parameter Store - good for configuration values
resource "aws_ssm_parameter" "db_url" {
  name  = "/myapp/${var.environment}/database-url"
  type  = "SecureString"
  value = "postgresql://${var.db_user}:${var.db_password}@${var.db_host}:5432/myapp"

  tags = {
    Name = "myapp-db-url"
  }
}

# Secrets Manager - good for rotating credentials
resource "aws_secretsmanager_secret" "api_key" {
  name = "myapp/${var.environment}/api-key"
}

resource "aws_secretsmanager_secret_version" "api_key" {
  secret_id = aws_secretsmanager_secret.api_key.id
  secret_string = jsonencode({
    api_key    = var.api_key
    api_secret = var.api_secret
  })
}

# Execution role needs permissions to read secrets
resource "aws_iam_role_policy" "execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/myapp/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.api_key.arn
      },
      {
        Effect   = "Allow"
        Action   = "kms:Decrypt"
        Resource = var.kms_key_arn
      }
    ]
  })
}
```

In the container definition, reference them:

```json
"secrets": [
  {
    "name": "DATABASE_URL",
    "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/production/database-url"
  },
  {
    "name": "API_KEY",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:myapp/production/api-key:api_key::"
  }
]
```

The format for Secrets Manager is `arn:secret_name:json_key:version_stage:version_id`.

## EFS Volume Mount

If your containers need persistent storage:

```hcl
resource "aws_ecs_task_definition" "with_efs" {
  family                   = "myapp-with-storage"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  # EFS volume
  volume {
    name = "app-data"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.app.id
      root_directory     = "/data"
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.app.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      mountPoints = [{
        sourceVolume  = "app-data"
        containerPath = "/app/data"
        readOnly      = false
      }]

      # ... other config
    }
  ])
}
```

## Task Definition Versioning

Each time you change a task definition, Terraform creates a new revision. The old revisions are kept:

```hcl
# Output the current revision
output "task_definition_arn" {
  description = "Full ARN including revision number"
  value       = aws_ecs_task_definition.app.arn
}

output "task_definition_revision" {
  description = "Current revision number"
  value       = aws_ecs_task_definition.app.revision
}
```

Services reference the task definition family, and you control whether they use the latest revision or a specific one.

## Outputs

```hcl
output "task_definition_family" {
  description = "Task definition family name"
  value       = aws_ecs_task_definition.app.family
}

output "task_definition_arn" {
  description = "Task definition ARN"
  value       = aws_ecs_task_definition.app.arn
}

output "container_name" {
  description = "Main container name"
  value       = "app"
}

output "container_port" {
  description = "Main container port"
  value       = 8080
}
```

## Summary

ECS task definitions in Terraform specify everything about how your containers run: the image, CPU and memory allocation, port mappings, logging, environment variables, secrets, health checks, and volumes. For Fargate, use `network_mode = "awsvpc"` and choose from the valid CPU/memory combinations. Use SSM Parameter Store or Secrets Manager for sensitive values - never put credentials in environment variables directly. Multi-container tasks let you run sidecars for monitoring, logging, or proxying alongside your application. Each update creates a new revision, which services can pick up automatically.
