# How to Implement ECS Container Security with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, ECS, AWS, Containers

Description: Learn how to secure AWS ECS services and tasks with Terraform, covering task roles, image scanning, network configuration, and runtime security.

---

Running containers on ECS introduces a set of security considerations that are different from traditional EC2 workloads. You need to think about container image security, task-level IAM roles, network isolation, secret injection, and logging. Terraform manages all of this declaratively, which means you can build secure container configurations once and replicate them across services.

This guide covers practical ECS security implementations with Terraform, focusing on Fargate for its stronger isolation model.

## Use Fargate for Better Isolation

Fargate provides stronger workload isolation than EC2 launch type because each task runs in its own kernel. There is no shared EC2 instance where a container escape could compromise other workloads.

```hcl
resource "aws_ecs_cluster" "main" {
  name = "production"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      # Encrypt exec command sessions
      kms_key_id = aws_kms_key.ecs.id
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = {
    Name        = "production"
    Environment = "production"
  }
}
```

## Task-Level IAM Roles

ECS has two types of IAM roles, and understanding the difference is critical for security:

- **Task Role**: Permissions your application code uses (S3 access, DynamoDB, etc.)
- **Execution Role**: Permissions ECS uses to pull images and write logs

```hcl
# Task execution role - used by ECS agent
resource "aws_iam_role" "ecs_execution" {
  name = "ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow execution role to read secrets
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "ecs-execution-secrets"
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
          aws_secretsmanager_secret.db_credentials.arn,
          aws_secretsmanager_secret.api_key.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.secrets.arn
      }
    ]
  })
}

# Task role - used by your application code
resource "aws_iam_role" "task" {
  name = "order-service-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Least privilege policy for the task
resource "aws_iam_role_policy" "task" {
  name = "order-service-permissions"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.orders.arn
      },
      {
        Effect = "Allow"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.exports.arn}/*"
      }
    ]
  })
}
```

## Secure Task Definition

```hcl
resource "aws_ecs_task_definition" "order_service" {
  family                   = "order-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024

  # Separate execution and task roles
  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name  = "order-service"
      image = "${aws_ecr_repository.order_service.repository_url}:${var.image_tag}"

      # Run as non-root user
      user = "1000:1000"

      # Read-only root filesystem
      readonlyRootFilesystem = true

      # Mount a writable tmpfs for temporary files
      mountPoints = [
        {
          sourceVolume  = "tmp"
          containerPath = "/tmp"
          readOnly      = false
        }
      ]

      # No elevated privileges
      privileged = false
      linuxParameters = {
        capabilities = {
          drop = ["ALL"]
          # Only add capabilities you actually need
          # add = ["NET_BIND_SERVICE"]
        }
        initProcessEnabled = true  # Proper signal handling
      }

      # Secrets from Secrets Manager (not environment variables)
      secrets = [
        {
          name      = "DB_CONNECTION_STRING"
          valueFrom = aws_secretsmanager_secret.db_credentials.arn
        },
        {
          name      = "API_KEY"
          valueFrom = aws_secretsmanager_secret.api_key.arn
        }
      ]

      # Non-sensitive environment variables
      environment = [
        {
          name  = "LOG_LEVEL"
          value = "info"
        },
        {
          name  = "TABLE_NAME"
          value = aws_dynamodb_table.orders.name
        }
      ]

      # Logging
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.order_service.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      # Health check
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])

  volume {
    name = "tmp"
  }

  tags = {
    Service = "order-service"
  }
}
```

## ECR Image Scanning

Scan container images for vulnerabilities before they run:

```hcl
resource "aws_ecr_repository" "order_service" {
  name                 = "order-service"
  image_tag_mutability = "IMMUTABLE"  # Prevent tag overwriting

  image_scanning_configuration {
    scan_on_push = true  # Scan every image on push
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }

  tags = {
    Service = "order-service"
  }
}

# Lifecycle policy to clean up old images
resource "aws_ecr_lifecycle_policy" "order_service" {
  repository = aws_ecr_repository.order_service.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only 10 most recent images"
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

## Network Security

```hcl
resource "aws_ecs_service" "order_service" {
  name            = "order-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.order_service.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  # Enable ECS Exec for debugging (with audit logging)
  enable_execute_command = true

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_task.id]
    assign_public_ip = false  # No public IPs for tasks
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.order_service.arn
    container_name   = "order-service"
    container_port   = 8080
  }
}

# Tight security group for the ECS tasks
resource "aws_security_group" "ecs_task" {
  name        = "ecs-order-service-sg"
  description = "Security group for order service ECS tasks"
  vpc_id      = aws_vpc.main.id

  # Allow inbound from ALB only
  ingress {
    description     = "From ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow outbound to specific services
  egress {
    description     = "To RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }

  egress {
    description = "HTTPS for AWS APIs"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecs-order-service-sg"
  }
}
```

## Logging and Monitoring

```hcl
resource "aws_cloudwatch_log_group" "order_service" {
  name              = "/ecs/order-service"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}

# Alarm for task failures
resource "aws_cloudwatch_metric_alarm" "ecs_task_failures" {
  alarm_name          = "ecs-order-service-task-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 0

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.order_service.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Wrapping Up

ECS container security is about applying defense in depth at every layer: secure images with scanning and immutable tags, least-privilege IAM roles separated between execution and task, network isolation with private subnets and tight security groups, secrets injected from Secrets Manager, read-only filesystems, and non-root users. Fargate simplifies much of this by providing kernel-level isolation between tasks. Build these patterns into reusable task definition modules so every service starts with a secure baseline.

For monitoring your ECS services in production, [OneUptime](https://oneuptime.com) provides container monitoring, log aggregation, and incident management to keep your services healthy.
