# How to Use ECS with EFS for Persistent Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, EFS, Persistent Storage, Containers

Description: A complete guide to mounting Amazon EFS file systems in ECS tasks for persistent, shared storage that survives container restarts and scales across tasks.

---

Containers are ephemeral by design. When a task stops, any data written to the container's filesystem disappears. That's usually fine for stateless applications, but some workloads need persistent storage - file uploads, shared configuration, machine learning models, or CMS content. Amazon EFS gives you a network file system that multiple ECS tasks can mount simultaneously, and the data persists regardless of task lifecycle.

EFS works with both Fargate and EC2 launch types. Tasks mount the file system like any NFS share, and your application reads and writes files as if they were local. Let's set this up.

## Creating an EFS File System

Start by creating the EFS file system and mount targets in your VPC.

```hcl
# Create the EFS file system
resource "aws_efs_file_system" "app_data" {
  creation_token = "app-persistent-data"
  encrypted      = true

  # Performance mode: generalPurpose (default) or maxIO
  performance_mode = "generalPurpose"

  # Throughput mode: bursting (default) or provisioned
  throughput_mode = "bursting"

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"  # Move old files to cheaper storage
  }

  tags = {
    Name = "app-persistent-data"
  }
}

# Create mount targets in each subnet where tasks run
resource "aws_efs_mount_target" "app_data" {
  for_each = toset(var.private_subnet_ids)

  file_system_id  = aws_efs_file_system.app_data.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}

# Security group for EFS - allow NFS from ECS tasks
resource "aws_security_group" "efs" {
  name_prefix = "efs-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
}
```

You need a mount target in every availability zone where your ECS tasks might run. If you have tasks in three AZs, you need three mount targets.

## EFS Access Points

Access points provide application-specific entry points into the file system. They let you enforce a specific user ID, group ID, and root directory for each application.

```hcl
# Access point for the web application
resource "aws_efs_access_point" "web_uploads" {
  file_system_id = aws_efs_file_system.app_data.id

  # Set the POSIX user identity for all operations
  posix_user {
    uid = 1000
    gid = 1000
  }

  # Automatically create the root directory if it doesn't exist
  root_directory {
    path = "/uploads"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }

  tags = {
    Name = "web-uploads"
  }
}

# Access point for shared config
resource "aws_efs_access_point" "shared_config" {
  file_system_id = aws_efs_file_system.app_data.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/config"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }
}
```

## Task Definition with EFS Volume

Now mount the EFS file system in your task definition. You define the volume at the task level and mount it in the container definition.

```json
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "volumes": [
    {
      "name": "uploads",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-0abc123def456789",
        "rootDirectory": "/",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-0abc123def456789",
          "iam": "ENABLED"
        }
      }
    }
  ],
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/app:latest",
      "essential": true,
      "portMappings": [
        { "containerPort": 8080, "protocol": "tcp" }
      ],
      "mountPoints": [
        {
          "sourceVolume": "uploads",
          "containerPath": "/app/uploads",
          "readOnly": false
        }
      ]
    }
  ]
}
```

In Terraform:

```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = "web-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  # Define the EFS volume
  volume {
    name = "uploads"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.app_data.id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.web_uploads.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repo_url}:${var.image_tag}"
      essential = true

      portMappings = [
        { containerPort = 8080, protocol = "tcp" }
      ]

      # Mount the EFS volume
      mountPoints = [
        {
          sourceVolume  = "uploads"
          containerPath = "/app/uploads"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/web-app"
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])
}
```

## IAM Permissions for EFS

When using IAM authorization (which you should for security), the task role needs permissions to mount the file system.

```hcl
resource "aws_iam_role_policy" "efs_access" {
  name = "efs-access"
  role = aws_iam_role.task_role.id

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
        Resource = aws_efs_file_system.app_data.arn
        Condition = {
          StringEquals = {
            "elasticfilesystem:AccessPointArn" = aws_efs_access_point.web_uploads.arn
          }
        }
      }
    ]
  })
}
```

You also need an EFS file system policy to allow IAM-based access.

```hcl
resource "aws_efs_file_system_policy" "app_data" {
  file_system_id = aws_efs_file_system.app_data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.task_role.arn
        }
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite"
        ]
        Resource = aws_efs_file_system.app_data.arn
        Condition = {
          Bool = {
            "elasticfilesystem:AccessedViaMountTarget" = "true"
          }
        }
      }
    ]
  })
}
```

## Shared Storage Between Tasks

One of EFS's biggest strengths is that multiple tasks can mount the same file system simultaneously. This is useful for workloads where multiple instances need to read and write the same files.

```hcl
# Multiple services sharing the same EFS volume
resource "aws_ecs_service" "web" {
  name            = "web-frontend"
  desired_count   = 3
  # All 3 tasks mount the same EFS uploads directory
}

resource "aws_ecs_service" "processor" {
  name            = "image-processor"
  desired_count   = 2
  # These 2 tasks also mount the same EFS uploads directory
  # They process files uploaded by the web service
}
```

## Performance Considerations

EFS performance depends on the mode you choose:

**Bursting throughput** - Free tier. Throughput scales with file system size. A 1 TB file system gets about 50 MB/s baseline with bursting up to 100 MB/s.

**Provisioned throughput** - You pay for a specific throughput level regardless of storage size. Use this for workloads with predictable I/O needs.

**Max I/O performance mode** - Higher aggregate throughput but slightly higher latency. Good for highly parallelized workloads with many tasks.

```hcl
# EFS with provisioned throughput for predictable performance
resource "aws_efs_file_system" "high_throughput" {
  creation_token   = "high-throughput-data"
  encrypted        = true
  performance_mode = "generalPurpose"
  throughput_mode  = "provisioned"

  # 100 MB/s provisioned throughput
  provisioned_throughput_in_mibps = 100
}
```

For most ECS workloads, bursting mode is fine. If you're doing heavy I/O (like serving many large files or processing lots of uploads), consider provisioned throughput.

## Read-Only Mounts

For configuration files or shared assets that don't change at runtime, mount EFS as read-only.

```json
{
  "mountPoints": [
    {
      "sourceVolume": "shared-config",
      "containerPath": "/app/config",
      "readOnly": true
    }
  ]
}
```

## Troubleshooting

**Task fails to start with mount error**: Check that mount targets exist in the same AZ/subnet as the task. Check that the security group allows NFS (port 2049) from the task's security group.

**Permission denied on file operations**: Verify the POSIX user ID in the access point matches what your container runs as. Check the IAM policy on the task role.

**Slow file operations**: EFS has higher latency than local disk. For workloads that need fast random I/O, consider caching frequently accessed files locally or using EBS volumes instead (see our post on [ECS with EBS volumes](https://oneuptime.com/blog/post/ecs-ebs-volumes/view)).

**File locks and contention**: EFS supports NFS file locking, but be careful with write-heavy workloads from multiple tasks. Use application-level locking or write to separate directories per task when possible.

EFS fills an important gap in the ECS storage story. When you need data that persists across task restarts and is accessible from multiple tasks, it's the go-to solution. Just be mindful of the performance characteristics and set up proper access controls with IAM and access points.
