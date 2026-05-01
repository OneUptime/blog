# How to Configure Amazon EFS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, EFS, AWS, Shared Storage, NFS, Infrastructure as Code

Description: Learn how to configure Amazon Elastic File System (EFS) with OpenTofu - creating file systems, mount targets, access points, lifecycle policies, and attaching EFS to EC2 and ECS workloads.

## Introduction

Amazon EFS provides scalable NFS file storage for EC2 instances, ECS containers, and Lambda functions. Multiple instances can mount the same EFS simultaneously, making it ideal for shared configuration, media files, and stateful container workloads. OpenTofu manages the file system, mount targets in each AZ, access points for application isolation, and backup policies.

## EFS File System

```hcl
resource "aws_efs_file_system" "app" {
  creation_token = "${var.environment}-app-efs"
  encrypted      = true
  kms_key_id     = aws_kms_key.efs.arn

  performance_mode = "generalPurpose"  # or "maxIO" for highly parallelized workloads that tolerate higher latency
  throughput_mode  = "bursting"        # or "provisioned" or "elastic"

  lifecycle_policy {
    transition_to_ia                    = "AFTER_30_DAYS"  # Move to EFS-IA
    transition_to_primary_storage_class = "AFTER_1_ACCESS"  # Restore on access
  }

  tags = {
    Name        = "${var.environment}-app-efs"
    Environment = var.environment
  }
}
```

## Mount Targets (One per AZ)

```hcl
resource "aws_efs_mount_target" "app" {
  count = length(aws_subnet.private)

  file_system_id  = aws_efs_file_system.app.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_security_group" "efs" {
  name        = "${var.environment}-efs-sg"
  description = "EFS mount target security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "NFS from app instances"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Access Points for Application Isolation

```hcl
# Each application gets its own access point with a dedicated directory

resource "aws_efs_access_point" "app" {
  file_system_id = aws_efs_file_system.app.id

  posix_user {
    gid = 1000
    uid = 1000
  }

  root_directory {
    path = "/app"

    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "755"
    }
  }

  tags = { Name = "${var.environment}-app-ap" }
}

resource "aws_efs_access_point" "uploads" {
  file_system_id = aws_efs_file_system.app.id

  posix_user {
    gid = 1001
    uid = 1001
  }

  root_directory {
    path = "/uploads"

    creation_info {
      owner_gid   = 1001
      owner_uid   = 1001
      permissions = "755"
    }
  }

  tags = { Name = "${var.environment}-uploads-ap" }
}
```

## EFS Backup Policy

```hcl
resource "aws_efs_backup_policy" "app" {
  file_system_id = aws_efs_file_system.app.id

  backup_policy {
    status = "ENABLED"
  }
}
```

## EFS File System Policy

```hcl
resource "aws_efs_file_system_policy" "app" {
  file_system_id = aws_efs_file_system.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnforceEncryptionInTransit"
        Effect = "Deny"
        Principal = { AWS = "*" }
        Action   = "*"
        Resource = aws_efs_file_system.app.arn
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      },
      {
        Sid    = "AllowAppAccess"
        Effect = "Allow"
        Principal = {
          AWS = [aws_iam_role.app.arn]
        }
        Action   = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite"
        ]
        Resource = aws_efs_file_system.app.arn
        Condition = {
          StringEquals = {
            "elasticfilesystem:AccessPointArn" = aws_efs_access_point.app.arn
          }
        }
      }
    ]
  })
}
```

## ECS Task with EFS Volume Mount

```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.environment}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  volume {
    name = "app-storage"

    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.app.id
      root_directory          = "/"
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2049

      authorization_config {
        access_point_id = aws_efs_access_point.app.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name  = "app"
    image = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"

    mountPoints = [{
      sourceVolume  = "app-storage"
      containerPath = "/data"
      readOnly      = false
    }]
  }])
}
```

## EC2 User Data for EFS Mount

```bash
#!/bin/bash
# Install EFS mount helper
yum install -y amazon-efs-utils

# Mount EFS using mount helper (handles TLS encryption)
mkdir -p /data/app

# Mount via fstab for persistence across reboots
echo "${efs_id}:/ /data/app efs _netdev,tls,iam,accesspoint=${access_point_id} 0 0" >> /etc/fstab
mount -a
```

## Conclusion

Amazon EFS with OpenTofu provides shared NFS storage for multi-instance and container workloads. Always enable encryption at rest (`encrypted = true`) and enforce encryption in transit via the file system policy (`aws:SecureTransport = false` deny). Use access points to isolate workloads into dedicated directories with controlled POSIX permissions. Enable the EFS lifecycle policy to automatically move infrequently accessed files to cost-optimized EFS-IA and restore them on first access with `AFTER_1_ACCESS`.
