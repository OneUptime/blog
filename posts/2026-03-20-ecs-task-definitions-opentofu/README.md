# How to Create ECS Task Definitions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, Task Definition, Fargate, Container Configuration, Infrastructure as Code

Description: Learn how to create ECS task definitions with OpenTofu for Fargate and EC2 launch types, including container definitions, environment variables from Secrets Manager, and health checks.

## Introduction

ECS task definitions are blueprints for running containerized applications, defining CPU and memory allocation, container images, port mappings, environment variables, secrets injection, and health checks. Task definitions are versioned-each update creates a new revision while preserving previous versions for rollback.

## Prerequisites

- OpenTofu v1.6+
- An ECR repository with a pushed container image
- An ECS task execution role with permission to pull images, write logs, and read any referenced Secrets Manager secrets or SSM parameters
- AWS credentials with ECS and IAM permissions

## Step 1: Create Fargate Task Definition

```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"  # Required for Fargate
  cpu                      = "512"     # 0.5 vCPU
  memory                   = "1024"    # 1 GB

  execution_role_arn = var.execution_role_arn  # For ECR pull, CloudWatch logs, and retrieving referenced secrets/parameters
  task_role_arn      = aws_iam_role.task.arn   # For application permissions

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

      # Inject environment variables
      environment = [
        { name = "APP_ENV", value = var.environment },
        { name = "PORT", value = "8080" }
      ]

      # Inject secrets from Secrets Manager or Parameter Store
      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = var.database_password_secret_arn
        },
        {
          name      = "API_KEY"
          valueFrom = var.api_key_parameter_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/app"
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60  # Grace period for startup
      }

      ulimits = [
        {
          name      = "nofile"
          softLimit = 65536
          hardLimit = 65536
        }
      ]

      readonlyRootFilesystem = false
      stopTimeout            = 30  # Seconds before SIGKILL after SIGTERM
    }
  ])

  tags = {
    Name        = "${var.project_name}-app"
    Environment = var.environment
  }
}
```

## Step 2: Task Role for Application Permissions

```hcl
resource "aws_iam_role" "task" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "task" {
  name = "app-permissions"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
        Resource = var.dynamodb_table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${var.s3_bucket_arn}/*"
      },
      # Required for ECS Exec; secret injection uses the task execution role
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Step 3: Multi-Container Task Definition

```hcl
resource "aws_ecs_task_definition" "with_sidecar" {
  family                   = "${var.project_name}-with-sidecar"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"

  execution_role_arn = var.execution_role_arn
  task_role_arn      = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repository_url}:latest"
      essential = true
      portMappings = [{ containerPort = 8080 }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/app"
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "app"
        }
      }
    },
    {
      # Datadog agent sidecar
      name      = "datadog-agent"
      image     = "datadog/agent:latest"
      essential = false  # Don't kill the task if this sidecar fails
      environment = [
        { name = "DD_API_KEY", value = var.datadog_api_key },
        { name = "ECS_FARGATE", value = "true" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/datadog"
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "dd"
        }
      }
    }
  ])
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Describe the latest ACTIVE task definition revision

aws ecs describe-task-definition \
  --task-definition my-project-app \
  --query 'taskDefinition.{Family: family, Revision: revision, CPU: cpu, Memory: memory}'
```

## Conclusion

Task definitions use JSON container definitions with specific field names that differ from Docker Compose-set `essential: false` for sidecars that shouldn't stop the task if they crash, and keep at least one container essential. Always define `healthCheck` with an appropriate `startPeriod` to prevent tasks from being marked unhealthy during startup. Use the `secrets` array for sensitive values so they aren't stored in plaintext in the task definition-the values are injected into the container as environment variables at start, and the task execution role must be allowed to read the referenced secrets or parameters.
