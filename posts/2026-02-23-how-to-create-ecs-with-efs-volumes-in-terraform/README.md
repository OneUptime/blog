# How to Create ECS with EFS Volumes in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, EFS, Persistent Storage, Fargate, Containers, Infrastructure as Code

Description: Learn how to mount EFS volumes in ECS tasks using Terraform for persistent shared storage across containers, including access points and encryption setup.

---

Containers are ephemeral, but many workloads need persistent storage that survives container restarts and can be shared across multiple tasks. Amazon EFS (Elastic File System) provides a fully managed, scalable NFS file system that integrates natively with ECS. With EFS, multiple ECS tasks can read and write to the same file system simultaneously, making it ideal for shared content, configuration files, and application data. This guide shows you how to set up ECS with EFS volumes using Terraform.

## Why EFS with ECS

EFS solves several storage challenges for containerized workloads. It provides persistent storage that is not tied to any single container or host. Multiple tasks can mount the same file system concurrently, enabling shared state between services. EFS automatically scales storage capacity as you add or remove files, so you never need to provision disk space in advance. It also works with both EC2 and Fargate launch types.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- A VPC with private subnets across multiple AZs
- Basic understanding of ECS and NFS

## Creating the EFS File System

Start by creating the EFS file system with encryption and mount targets.

```hcl
provider "aws" {
  region = "us-east-1"
}

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

# Security group for EFS mount targets
resource "aws_security_group" "efs" {
  name_prefix = "efs-"
  vpc_id      = data.aws_vpc.main.id

  # Allow NFS traffic from ECS tasks
  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description     = "NFS from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "efs-security-group"
  }
}

# Security group for ECS tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "ecs-tasks-"
  vpc_id      = data.aws_vpc.main.id

  # Allow outbound NFS to EFS
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecs-tasks-sg"
  }
}

# EFS file system
resource "aws_efs_file_system" "main" {
  creation_token = "ecs-shared-storage"

  # Enable encryption at rest
  encrypted  = true
  kms_key_id = aws_kms_key.efs.arn

  # Performance mode: generalPurpose or maxIO
  performance_mode = "generalPurpose"

  # Throughput mode: bursting or provisioned
  throughput_mode = "bursting"

  # Lifecycle policy to move infrequently accessed files to IA storage
  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  lifecycle_policy {
    transition_to_primary_storage_class = "AFTER_1_ACCESS"
  }

  tags = {
    Name        = "ecs-shared-storage"
    Environment = "production"
  }
}

# KMS key for EFS encryption
resource "aws_kms_key" "efs" {
  description             = "KMS key for EFS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

# Mount targets in each subnet
resource "aws_efs_mount_target" "main" {
  count           = length(data.aws_subnets.private.ids)
  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = data.aws_subnets.private.ids[count.index]
  security_groups = [aws_security_group.efs.id]
}
```

## Creating EFS Access Points

Access points provide application-specific entry points into the EFS file system with their own POSIX user identity and root directory.

```hcl
# Access point for the application data
resource "aws_efs_access_point" "app_data" {
  file_system_id = aws_efs_file_system.main.id

  # Set the POSIX user for file operations
  posix_user {
    uid = 1000
    gid = 1000
  }

  # Root directory for this access point
  root_directory {
    path = "/app-data"

    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }

  tags = {
    Name    = "app-data-access-point"
    Purpose = "application-data"
  }
}

# Access point for shared uploads
resource "aws_efs_access_point" "uploads" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/uploads"

    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }

  tags = {
    Name    = "uploads-access-point"
    Purpose = "file-uploads"
  }
}

# Access point for shared configuration
resource "aws_efs_access_point" "config" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid = 0    # Root for config files
    gid = 0
  }

  root_directory {
    path = "/config"

    creation_info {
      owner_uid   = 0
      owner_gid   = 0
      permissions = "755"
    }
  }

  tags = {
    Name    = "config-access-point"
    Purpose = "shared-configuration"
  }
}
```

## ECS Cluster and IAM Roles

```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Task execution role
resource "aws_iam_role" "ecs_task_execution" {
  name = "ecs-task-execution-role"

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

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role with EFS permissions
resource "aws_iam_role" "ecs_task" {
  name = "ecs-task-role"

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

# EFS access policy for the task role
resource "aws_iam_role_policy" "ecs_task_efs" {
  name = "ecs-task-efs-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess"
        ]
        Resource = aws_efs_file_system.main.arn
      }
    ]
  })
}
```

## Task Definition with EFS Volume

Define the task with EFS volumes and mount points.

```hcl
# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/production"
  retention_in_days = 30
}

# Task definition with EFS volumes
resource "aws_ecs_task_definition" "app" {
  family                   = "app-with-efs"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  # Define EFS volumes
  volume {
    name = "app-data"

    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.main.id
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2049

      authorization_config {
        access_point_id = aws_efs_access_point.app_data.id
        iam             = "ENABLED"
      }
    }
  }

  volume {
    name = "uploads"

    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.main.id
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2050  # Different port for each volume

      authorization_config {
        access_point_id = aws_efs_access_point.uploads.id
        iam             = "ENABLED"
      }
    }
  }

  volume {
    name = "config"

    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.main.id
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2051

      authorization_config {
        access_point_id = aws_efs_access_point.config.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "your-account.dkr.ecr.us-east-1.amazonaws.com/app:latest"
      cpu       = 512
      memory    = 1024
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      # Mount the EFS volumes into the container
      mountPoints = [
        {
          sourceVolume  = "app-data"
          containerPath = "/data"
          readOnly      = false
        },
        {
          sourceVolume  = "uploads"
          containerPath = "/uploads"
          readOnly      = false
        },
        {
          sourceVolume  = "config"
          containerPath = "/config"
          readOnly      = true  # Config is read-only
        }
      ]

      environment = [
        {
          name  = "DATA_PATH"
          value = "/data"
        },
        {
          name  = "UPLOAD_PATH"
          value = "/uploads"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])

  tags = {
    Name = "app-with-efs"
  }
}
```

## ECS Service

```hcl
# ECS Service
resource "aws_ecs_service" "app" {
  name            = "app-with-efs"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  # Platform version 1.4.0+ required for EFS
  platform_version = "LATEST"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  # Ensure mount targets are ready before starting tasks
  depends_on = [aws_efs_mount_target.main]

  tags = {
    Name = "app-with-efs-service"
  }
}
```

## EFS File System Policy

Add a file system policy to restrict access to authorized principals only.

```hcl
# EFS file system policy
resource "aws_efs_file_system_policy" "main" {
  file_system_id = aws_efs_file_system.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnforceEncryptionInTransit"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action    = "*"
        Resource  = aws_efs_file_system.main.arn
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "AllowECSTaskAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ecs_task.arn
        }
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite"
        ]
        Resource = aws_efs_file_system.main.arn
      }
    ]
  })
}
```

## Outputs

```hcl
output "efs_file_system_id" {
  description = "EFS file system ID"
  value       = aws_efs_file_system.main.id
}

output "efs_dns_name" {
  description = "EFS DNS name"
  value       = aws_efs_file_system.main.dns_name
}

output "access_points" {
  description = "EFS access point IDs"
  value = {
    app_data = aws_efs_access_point.app_data.id
    uploads  = aws_efs_access_point.uploads.id
    config   = aws_efs_access_point.config.id
  }
}
```

## Best Practices

When using EFS with ECS, always enable encryption at rest and in transit. Use access points to provide application-specific views of the file system with proper POSIX permissions. Set lifecycle policies to automatically move infrequently accessed files to the IA storage class for cost savings. Create mount targets in every subnet where your ECS tasks run. Use the `depends_on` attribute to ensure mount targets are ready before ECS tasks try to connect. Monitor EFS throughput and burst credits in CloudWatch.

## Monitoring with OneUptime

EFS performance directly impacts your containerized applications. Use [OneUptime](https://oneuptime.com) to monitor EFS throughput, I/O latency, and burst credit balance alongside your ECS task metrics for a complete view of your application health.

## Conclusion

EFS integration with ECS provides the persistent, shared storage that many containerized workloads need. Whether you are sharing uploaded files between multiple task instances, storing application data that survives container restarts, or distributing configuration files across services, EFS and ECS work together seamlessly. Terraform makes it easy to define the complete setup, from the file system and access points to the task definitions and services, all as version-controlled code.

For more ECS storage and configuration topics, check out our guides on [ECS with Secrets Manager](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-secrets-manager-integration-in-terraform/view) and [ECS blue-green deployment](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-blue-green-deployment-in-terraform/view).
