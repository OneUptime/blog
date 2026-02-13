# How to Set Up EFS with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Terraform, Infrastructure as Code

Description: Complete guide to setting up Amazon EFS with Terraform including file systems, mount targets, access points, security groups, lifecycle policies, and monitoring.

---

Setting up EFS through the console is fine for experimentation, but for production you want it codified in Terraform. This way it's version-controlled, reproducible, and consistent across environments. EFS has several moving parts - the file system itself, mount targets, security groups, access points, lifecycle policies, and file system policies - so getting the Terraform right saves you from clicking through console wizards repeatedly.

Let's build a complete, production-ready EFS setup in Terraform, piece by piece.

## Basic File System

Start with the core resource:

```hcl
resource "aws_efs_file_system" "main" {
  # Always encrypt - no performance penalty
  encrypted = true

  # General Purpose is right for most workloads
  performance_mode = "generalPurpose"

  # Bursting is the default and usually sufficient
  throughput_mode = "bursting"

  # Move cold files to IA after 30 days
  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  # Move files back to Standard when accessed
  lifecycle_policy {
    transition_to_primary_storage_class = "AFTER_1_ACCESS"
  }

  tags = {
    Name        = "${var.project}-efs"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

## Variables

Define the inputs for reusability:

```hcl
variable "project" {
  description = "Project name for resource naming"
  type        = string
  default     = "myapp"
}

variable "environment" {
  description = "Environment (production, staging, development)"
  type        = string
  default     = "production"
}

variable "vpc_id" {
  description = "VPC ID where EFS will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for mount targets"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to mount EFS"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to mount EFS"
  type        = list(string)
  default     = []
}
```

## Security Group

Create a dedicated security group for the EFS mount targets:

```hcl
resource "aws_security_group" "efs" {
  name_prefix = "${var.project}-efs-"
  vpc_id      = var.vpc_id
  description = "Security group for ${var.project} EFS mount targets"

  tags = {
    Name        = "${var.project}-efs-sg"
    Environment = var.environment
  }

  # Prevent Terraform from destroying and recreating
  # the SG when name_prefix generates a new name
  lifecycle {
    create_before_destroy = true
  }
}

# Allow NFS from specific security groups
resource "aws_security_group_rule" "efs_ingress_sg" {
  count = length(var.allowed_security_group_ids)

  type                     = "ingress"
  from_port                = 2049
  to_port                  = 2049
  protocol                 = "tcp"
  security_group_id        = aws_security_group.efs.id
  source_security_group_id = var.allowed_security_group_ids[count.index]
  description              = "NFS from allowed security group"
}

# Allow NFS from CIDR blocks (optional)
resource "aws_security_group_rule" "efs_ingress_cidr" {
  count = length(var.allowed_cidr_blocks) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = 2049
  to_port           = 2049
  protocol          = "tcp"
  security_group_id = aws_security_group.efs.id
  cidr_blocks       = var.allowed_cidr_blocks
  description       = "NFS from allowed CIDR blocks"
}
```

## Mount Targets

Create a mount target in each subnet:

```hcl
resource "aws_efs_mount_target" "main" {
  for_each = toset(var.private_subnet_ids)

  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}
```

Using `for_each` instead of `count` is important here. With `count`, adding or removing a subnet would shift indices and potentially recreate mount targets. With `for_each`, each mount target is keyed by its subnet ID, so changes are isolated.

## File System Policy

Enforce encryption in transit and require access points:

```hcl
resource "aws_efs_file_system_policy" "main" {
  file_system_id = aws_efs_file_system.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceEncryptionInTransit"
        Effect    = "Deny"
        Principal = { AWS = "*" }
        Action    = "*"
        Resource  = "*"
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "EnforceRootAccess"
        Effect    = "Deny"
        Principal = { AWS = "*" }
        Action    = "elasticfilesystem:ClientRootAccess"
        Resource  = "*"
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

## Access Points

Create access points for different applications:

```hcl
variable "access_points" {
  description = "Map of access points to create"
  type = map(object({
    posix_user = object({
      uid            = number
      gid            = number
      secondary_gids = optional(list(number), [])
    })
    root_directory = object({
      path        = string
      permissions = string
    })
  }))
  default = {
    webapp = {
      posix_user = {
        uid = 1001
        gid = 1001
      }
      root_directory = {
        path        = "/webapp"
        permissions = "755"
      }
    }
    worker = {
      posix_user = {
        uid = 1002
        gid = 1002
      }
      root_directory = {
        path        = "/worker"
        permissions = "750"
      }
    }
  }
}

resource "aws_efs_access_point" "app" {
  for_each = var.access_points

  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid            = each.value.posix_user.uid
    gid            = each.value.posix_user.gid
    secondary_gids = each.value.posix_user.secondary_gids
  }

  root_directory {
    path = each.value.root_directory.path

    creation_info {
      owner_uid   = each.value.posix_user.uid
      owner_gid   = each.value.posix_user.gid
      permissions = each.value.root_directory.permissions
    }
  }

  tags = {
    Name        = "${var.project}-${each.key}-ap"
    Application = each.key
    Environment = var.environment
  }
}
```

## KMS Key for Encryption

For production, use a customer-managed KMS key:

```hcl
resource "aws_kms_key" "efs" {
  description             = "KMS key for ${var.project} EFS encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAccountAdmin"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowEFS"
        Effect = "Allow"
        Principal = { AWS = "*" }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService"    = "elasticfilesystem.${data.aws_region.current.name}.amazonaws.com"
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-efs-kms"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "efs" {
  name          = "alias/${var.project}-efs"
  target_key_id = aws_kms_key.efs.key_id
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
```

Then reference the key in the file system:

```hcl
resource "aws_efs_file_system" "main" {
  encrypted  = true
  kms_key_id = aws_kms_key.efs.arn

  # ... rest of configuration
}
```

## CloudWatch Alarms

Add monitoring:

```hcl
variable "sns_topic_arn" {
  description = "SNS topic for alarm notifications"
  type        = string
}

resource "aws_cloudwatch_metric_alarm" "burst_credits" {
  alarm_name          = "${var.project}-efs-burst-credits"
  alarm_description   = "EFS burst credits low for ${var.project}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 6
  metric_name         = "BurstCreditBalance"
  namespace           = "AWS/EFS"
  period              = 300
  statistic           = "Average"
  threshold           = 1099511627776  # 1 TB in bytes

  dimensions = {
    FileSystemId = aws_efs_file_system.main.id
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "io_limit" {
  alarm_name          = "${var.project}-efs-io-limit"
  alarm_description   = "EFS approaching IOPS limit for ${var.project}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 6
  metric_name         = "PercentIOLimit"
  namespace           = "AWS/EFS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 80

  dimensions = {
    FileSystemId = aws_efs_file_system.main.id
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}
```

For a deeper dive on EFS monitoring, see our post on [monitoring EFS with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-efs-cloudwatch/view).

## Outputs

Export useful values for other modules:

```hcl
output "file_system_id" {
  description = "EFS file system ID"
  value       = aws_efs_file_system.main.id
}

output "file_system_arn" {
  description = "EFS file system ARN"
  value       = aws_efs_file_system.main.arn
}

output "file_system_dns_name" {
  description = "EFS DNS name for mounting"
  value       = "${aws_efs_file_system.main.id}.efs.${data.aws_region.current.name}.amazonaws.com"
}

output "security_group_id" {
  description = "Security group ID for EFS mount targets"
  value       = aws_security_group.efs.id
}

output "mount_target_ids" {
  description = "Map of subnet ID to mount target ID"
  value       = { for k, v in aws_efs_mount_target.main : k => v.id }
}

output "access_point_ids" {
  description = "Map of access point name to ID"
  value       = { for k, v in aws_efs_access_point.app : k => v.id }
}

output "access_point_arns" {
  description = "Map of access point name to ARN"
  value       = { for k, v in aws_efs_access_point.app : k => v.arn }
}
```

## Using the Module

Call the module from your root configuration:

```hcl
module "efs" {
  source = "./modules/efs"

  project     = "myapp"
  environment = "production"
  vpc_id      = module.vpc.vpc_id

  private_subnet_ids = module.vpc.private_subnet_ids

  allowed_security_group_ids = [
    module.ecs.task_security_group_id,
    module.ec2.instance_security_group_id,
  ]

  access_points = {
    webapp = {
      posix_user = { uid = 1001, gid = 1001 }
      root_directory = { path = "/webapp", permissions = "755" }
    }
    processor = {
      posix_user = { uid = 1002, gid = 1002 }
      root_directory = { path = "/processor", permissions = "750" }
    }
  }

  sns_topic_arn = module.monitoring.sns_topic_arn
}

# Use the outputs
resource "aws_ecs_task_definition" "webapp" {
  # ... other config

  volume {
    name = "efs-data"

    efs_volume_configuration {
      file_system_id     = module.efs.file_system_id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = module.efs.access_point_ids["webapp"]
        iam             = "ENABLED"
      }
    }
  }
}
```

## EFS Replication with Terraform

Add cross-region replication for disaster recovery:

```hcl
resource "aws_efs_replication_configuration" "main" {
  source_file_system_id = aws_efs_file_system.main.id

  destination {
    region = var.dr_region
  }
}
```

For more on replication, see our post on [EFS replication for disaster recovery](https://oneuptime.com/blog/post/2026-02-12-efs-replication-disaster-recovery/view).

## Common Terraform Patterns

### Conditional Provisioned Throughput

```hcl
variable "throughput_mode" {
  type    = string
  default = "bursting"
}

variable "provisioned_throughput_mibps" {
  type    = number
  default = null
}

resource "aws_efs_file_system" "main" {
  encrypted      = true
  throughput_mode = var.throughput_mode

  provisioned_throughput_in_mibps = (
    var.throughput_mode == "provisioned"
    ? var.provisioned_throughput_mibps
    : null
  )

  # ... rest of config
}
```

### Environment-Specific Configurations

```hcl
locals {
  efs_config = {
    production = {
      performance_mode    = "generalPurpose"
      throughput_mode     = "bursting"
      transition_to_ia    = "AFTER_30_DAYS"
      encrypted           = true
    }
    staging = {
      performance_mode    = "generalPurpose"
      throughput_mode     = "bursting"
      transition_to_ia    = "AFTER_14_DAYS"
      encrypted           = true
    }
    development = {
      performance_mode    = "generalPurpose"
      throughput_mode     = "bursting"
      transition_to_ia    = "AFTER_7_DAYS"
      encrypted           = true
    }
  }

  config = local.efs_config[var.environment]
}

resource "aws_efs_file_system" "main" {
  encrypted        = local.config.encrypted
  performance_mode = local.config.performance_mode
  throughput_mode  = local.config.throughput_mode

  lifecycle_policy {
    transition_to_ia = local.config.transition_to_ia
  }
}
```

## Best Practices

1. **Use `for_each` for mount targets** - not `count`. It handles changes much better.
2. **Always set `create_before_destroy`** on security groups to avoid downtime during changes.
3. **Use a customer-managed KMS key** for production file systems.
4. **Export access point ARNs** - they're needed for IAM policies and Lambda configurations.
5. **Include CloudWatch alarms** in the same module so monitoring is always deployed with the file system.
6. **Use variables for everything** that might differ between environments.

## Wrapping Up

A well-structured Terraform module for EFS covers the file system, security, mount targets, access points, encryption, lifecycle policies, and monitoring - all in one deployable unit. The module approach means you set it up once and reuse it across environments with different variable values. No more clicking through console wizards, no more inconsistencies between staging and production, and no more forgetting to set up monitoring.
