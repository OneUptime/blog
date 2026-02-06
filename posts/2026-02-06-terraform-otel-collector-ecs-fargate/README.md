# How to Use Terraform to Deploy and Configure the OpenTelemetry Collector on AWS ECS Fargate Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terraform, AWS ECS, Fargate, Infrastructure as Code

Description: Deploy the OpenTelemetry Collector as a sidecar on AWS ECS Fargate using Terraform with full infrastructure-as-code configuration.

Running the OpenTelemetry Collector on ECS Fargate is a solid choice for serverless container workloads. Fargate handles the compute, and the Collector runs as a sidecar container alongside your application. Terraform makes this deployment repeatable and version-controlled.

## Architecture

The Collector runs as an additional container in the same ECS task definition as your application. Your application sends telemetry to `localhost:4317` (gRPC) or `localhost:4318` (HTTP), and the Collector forwards it to your backend.

## Terraform Configuration

### Collector Configuration File

First, create the Collector configuration that will be passed as an environment variable or mounted as a file:

```hcl
# collector-config.tf

locals {
  collector_config = yamlencode({
    receivers = {
      otlp = {
        protocols = {
          grpc = { endpoint = "0.0.0.0:4317" }
          http = { endpoint = "0.0.0.0:4318" }
        }
      }
    }
    processors = {
      batch = {
        timeout     = "5s"
        send_batch_size = 512
      }
      resource = {
        attributes = [
          {
            key    = "deployment.environment"
            value  = var.environment
            action = "upsert"
          },
          {
            key    = "service.version"
            value  = var.app_version
            action = "upsert"
          }
        ]
      }
    }
    exporters = {
      otlp = {
        endpoint = var.otlp_endpoint
        headers = {
          Authorization = "Bearer $${OTLP_API_KEY}"
        }
      }
    }
    service = {
      pipelines = {
        traces = {
          receivers  = ["otlp"]
          processors = ["resource", "batch"]
          exporters  = ["otlp"]
        }
        metrics = {
          receivers  = ["otlp"]
          processors = ["resource", "batch"]
          exporters  = ["otlp"]
        }
        logs = {
          receivers  = ["otlp"]
          processors = ["resource", "batch"]
          exporters  = ["otlp"]
        }
      }
    }
  })
}
```

### ECS Task Definition

```hcl
# ecs.tf

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.app_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    # Application container
    {
      name      = var.app_name
      image     = "${var.ecr_repo_url}:${var.app_version}"
      essential = true
      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
          value = "http://localhost:4317"
        },
        {
          name  = "OTEL_SERVICE_NAME"
          value = var.app_name
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      }
    },
    # OpenTelemetry Collector sidecar
    {
      name      = "otel-collector"
      image     = "otel/opentelemetry-collector-contrib:0.96.0"
      essential = false
      command   = ["--config=env:COLLECTOR_CONFIG"]
      environment = [
        {
          name  = "COLLECTOR_CONFIG"
          value = local.collector_config
        }
      ]
      secrets = [
        {
          name      = "OTLP_API_KEY"
          valueFrom = aws_secretsmanager_secret.otlp_api_key.arn
        }
      ]
      portMappings = [
        {
          containerPort = 4317
          protocol      = "tcp"
        },
        {
          containerPort = 4318
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.collector.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "otel"
        }
      }
    }
  ])
}
```

### Supporting Resources

```hcl
# supporting.tf

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.app_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "collector" {
  name              = "/ecs/${var.app_name}-otel"
  retention_in_days = 7
}

resource "aws_secretsmanager_secret" "otlp_api_key" {
  name = "${var.app_name}/otlp-api-key"
}

resource "aws_iam_role" "ecs_execution" {
  name = "${var.app_name}-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow the execution role to read secrets
resource "aws_iam_role_policy" "secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.otlp_api_key.arn]
      }
    ]
  })
}
```

### Variables

```hcl
# variables.tf

variable "app_name" {
  description = "Name of the application"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "app_version" {
  description = "Application version tag"
  type        = string
}

variable "otlp_endpoint" {
  description = "OTLP backend endpoint"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "task_cpu" {
  description = "Task CPU units"
  type        = string
  default     = "512"
}

variable "task_memory" {
  description = "Task memory in MB"
  type        = string
  default     = "1024"
}
```

## Resource Sizing

The Collector sidecar adds overhead to your Fargate task. Plan for approximately 128MB of memory and 0.25 vCPU for moderate throughput. Adjust the task's total CPU and memory accordingly.

## Deploying

```bash
terraform init
terraform plan -var="app_version=1.0.0" -var="otlp_endpoint=https://backend.example.com:4317"
terraform apply
```

This setup gives you a fully managed, version-controlled Collector deployment on Fargate. Changes to the Collector configuration go through your normal Terraform workflow with plan review and state tracking.
