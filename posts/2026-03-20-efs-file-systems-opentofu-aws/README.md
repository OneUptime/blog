# How to Create and Mount EFS File Systems on AWS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EFS, NFS, Terraform, Infrastructure as Code, Shared Storage

Description: Learn how to create Amazon EFS file systems, configure mount targets, set access points, and mount them to EC2 instances and ECS tasks using OpenTofu.

---

Amazon Elastic File System (EFS) provides scalable, shared NFS storage for AWS workloads. Multiple EC2 instances and ECS tasks can mount the same EFS simultaneously. This guide covers creating EFS, configuring mount targets, and integrating with EC2 and ECS using OpenTofu.

---

## Create an EFS File System

```hcl
# efs.tf

resource "aws_efs_file_system" "main" {
  creation_token   = "app-shared-storage"
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"
  encrypted        = true
  kms_key_id       = aws_kms_key.efs.arn

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  lifecycle_policy {
    transition_to_primary_storage_class = "AFTER_1_ACCESS"
  }

  tags = {
    Name        = "app-shared-storage"
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}
```

---

## Create Mount Targets

Mount targets are created in each Availability Zone where instances need to mount EFS. Provide one subnet ID per AZ:

```hcl
# Create one mount target per Availability Zone
resource "aws_efs_mount_target" "main" {
  for_each = toset(var.private_subnet_ids)

  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}

# Security group for EFS - allow NFS from EC2/ECS
resource "aws_security_group" "efs" {
  name   = "efs-sg"
  vpc_id = data.aws_vpc.main.id

  ingress {
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

---

## Create EFS Access Points

Access points enforce specific UIDs/GIDs and directory paths per application:

```hcl
resource "aws_efs_access_point" "app" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/app"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }

  tags = {
    Name = "app-access-point"
  }
}

resource "aws_efs_access_point" "logs" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/logs"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }
}
```

---

## Mount EFS on EC2 Instances

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  subnet_id     = data.aws_subnets.private.ids[0]

  user_data = <<-EOF
    #!/bin/bash
    yum install -y amazon-efs-utils

    # Mount EFS
    mkdir -p /mnt/efs
    mount -t efs -o tls ${aws_efs_file_system.main.id}:/ /mnt/efs

    # Mount using access point
    mkdir -p /mnt/app
    mount -t efs -o tls,accesspoint=${aws_efs_access_point.app.id} \
      ${aws_efs_file_system.main.id}:/ /mnt/app

    # Add to fstab for persistent mount
    echo "${aws_efs_file_system.main.id}:/ /mnt/efs efs _netdev,tls 0 0" >> /etc/fstab
  EOF

  depends_on = [aws_efs_mount_target.main]
}
```

---

## Mount EFS in ECS Fargate Tasks

```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  volume {
    name = "shared-storage"

    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.main.id
      root_directory          = "/"
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2999

      authorization_config {
        access_point_id = aws_efs_access_point.app.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "my-app:latest"
      mountPoints = [
        {
          sourceVolume  = "shared-storage"
          containerPath = "/data"
          readOnly      = false
        }
      ]
    }
  ])
}
```

---

## EFS File System Policy

```hcl
resource "aws_efs_file_system_policy" "main" {
  file_system_id = aws_efs_file_system.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = aws_iam_role.ecs_task.arn }
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite"
        ]
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

---

## Outputs

```hcl
output "efs_id" {
  value = aws_efs_file_system.main.id
}

output "efs_dns_name" {
  value = aws_efs_file_system.main.dns_name
}
```

---

## Best Practices

1. **Use access points** to isolate different applications sharing the same EFS
2. **Enable encryption at rest and in transit** for all production file systems
3. **Create mount targets in every AZ** your instances use to avoid cross-AZ traffic costs
4. **Enable lifecycle policies** to move infrequently accessed files to IA storage
5. **Monitor with CloudWatch** - watch BurstCreditBalance and PercentIOLimit

---

## Conclusion

EFS provides scalable shared storage for multi-instance and ECS workloads. OpenTofu makes it easy to define the file system, mount targets, access points, and security groups as reproducible code. Use access points to enforce per-application isolation and permissions.

---

*Monitor your application storage and infrastructure with [OneUptime](https://oneuptime.com).*
