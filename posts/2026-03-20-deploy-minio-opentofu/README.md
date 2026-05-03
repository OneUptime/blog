# How to Deploy Minio with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, MinIO, Object Storage, S3-Compatible, Self-Hosted

Description: Learn how to deploy MinIO object storage on AWS using OpenTofu with ECS Fargate and EFS for persistent storage, providing an S3-compatible API for your applications.

## Introduction

MinIO is an S3-compatible object storage system that can run on your own infrastructure. This guide deploys MinIO on AWS ECS Fargate with EFS for persistent storage and an ALB for HTTPS access, providing a self-hosted alternative to S3.

## EFS for Persistent Storage

```hcl
resource "aws_efs_file_system" "minio" {
  creation_token = "minio-${var.environment}"
  encrypted      = true
  kms_key_id     = aws_kms_key.efs.arn

  throughput_mode  = "elastic"

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = { Name = "minio-data-${var.environment}" }
}

resource "aws_efs_mount_target" "minio" {
  for_each       = toset(var.private_subnet_ids)
  file_system_id = aws_efs_file_system.minio.id
  subnet_id      = each.value
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "minio" {
  file_system_id = aws_efs_file_system.minio.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/minio"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }
}
```

## ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "minio" {
  family                   = "minio-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.minio_task.arn

  volume {
    name = "minio-data"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.minio.id
      transit_encryption = "ENABLED"
      root_directory     = "/"
      authorization_config {
        access_point_id = aws_efs_access_point.minio.id
        iam             = "DISABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name  = "minio"
    image = "minio/minio:latest"

    command = ["server", "/data", "--console-address", ":9001"]

    environment = [
      { name = "MINIO_VOLUMES", value = "/data" },
    ]

    secrets = [
      { name = "MINIO_ROOT_USER",     valueFrom = aws_secretsmanager_secret.minio_root_user.arn },
      { name = "MINIO_ROOT_PASSWORD", valueFrom = aws_secretsmanager_secret.minio_root_password.arn },
    ]

    portMappings = [
      { containerPort = 9000, protocol = "tcp", name = "api" },
      { containerPort = 9001, protocol = "tcp", name = "console" },
    ]

    mountPoints = [{
      sourceVolume  = "minio-data"
      containerPath = "/data"
      readOnly      = false
    }]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:9000/minio/health/live || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/minio-${var.environment}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "minio"
      }
    }
  }])
}
```

## ALB Configuration

```hcl
# MinIO API endpoint

resource "aws_lb_target_group" "minio_api" {
  name        = "minio-api-${var.environment}"
  port        = 9000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/minio/health/live"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }
}

# MinIO Console endpoint
resource "aws_lb_target_group" "minio_console" {
  name        = "minio-console-${var.environment}"
  port        = 9001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path = "/minio/health/live"
  }
}
```

## Managing MinIO with the MinIO Provider

```hcl
provider "minio" {
  minio_server   = "${var.minio_hostname}:9000"
  minio_user     = var.minio_root_user
  minio_password = var.minio_root_password
  minio_ssl      = true
}

resource "minio_s3_bucket" "app_uploads" {
  bucket = "app-uploads-${var.environment}"
  acl    = "private"
}

resource "minio_iam_user" "app" {
  name   = "app-service"
  secret = random_password.minio_app_secret.result
}

resource "minio_iam_policy" "app_uploads" {
  name   = "app-uploads-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = ["arn:aws:s3:::app-uploads-${var.environment}/*"]
    }]
  })
}
```

## Conclusion

Deploying MinIO with OpenTofu provides an S3-compatible object storage system on your own infrastructure. EFS provides the persistent, highly available storage that ECS Fargate requires for stateful workloads. The MinIO provider lets you create buckets, users, and policies as code after deployment, maintaining the infrastructure-as-code approach through the full stack.
