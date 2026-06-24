# How to Design a Database Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, RDS, AWS, Module, Database, PostgreSQL

Description: Learn how to design a reusable RDS database module for OpenTofu that supports multiple engines, multi-AZ configurations, read replicas, and automated backups.

## Introduction

A database module should handle the core RDS configuration - subnet groups, parameter groups, security groups, backups, and monitoring - while exposing a clean interface for application teams who just need a database with sensible defaults.

## Module Structure

```text
modules/database/
├── main.tf
├── variables.tf
├── outputs.tf
├── security-group.tf
└── versions.tf
```

## variables.tf

```hcl
variable "identifier"       { type = string }
variable "engine_version" {
  type    = string
  default = "15.17"
}
variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}
variable "allocated_storage" {
  type    = number
  default = 20
}
variable "max_allocated_storage" {
  type    = number
  default = 100
}

variable "database_name"   { type = string }
variable "username"        { type = string }
variable "password" {
  type      = string
  sensitive = true
}

variable "vpc_id"          { type = string }
variable "subnet_ids"      { type = list(string) }
variable "allowed_cidr_blocks" {
  type    = list(string)
  default = []
}
variable "allowed_security_group_ids" {
  type    = list(string)
  default = []
}

variable "multi_az" {
  type    = bool
  default = false
}
variable "deletion_protection" {
  type    = bool
  default = false
}
variable "skip_final_snapshot" {
  type    = bool
  default = true
}
variable "backup_retention_period" {
  type    = number
  default = 7
}
variable "backup_window" {
  type    = string
  default = "03:00-04:00"
}
variable "maintenance_window" {
  type    = string
  default = "sun:04:00-sun:06:00"
}

variable "performance_insights_enabled" {
  type    = bool
  default = false
}
variable "monitoring_interval" {
  type    = number
  default = 0
}

variable "environment" { type = string }
variable "tags" {
  type    = map(string)
  default = {}
}
```

## main.tf

```hcl
locals {
  tags   = merge({ Environment = var.environment, ManagedBy = "OpenTofu" }, var.tags)
  family = "postgres${split(".", var.engine_version)[0]}"
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.identifier}-subnet-group"
  subnet_ids = var.subnet_ids
  tags       = merge(local.tags, { Name = "${var.identifier}-subnet-group" })
}

resource "aws_db_parameter_group" "main" {
  name   = "${var.identifier}-params"
  family = local.family

  parameter {
    name  = "log_connections"
    value = "1"
  }

  tags = local.tags
}

resource "aws_security_group" "db" {
  name        = "${var.identifier}-sg"
  description = "Security group for ${var.identifier} database"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = length(var.allowed_cidr_blocks) > 0 ? [1] : []
    content {
      from_port   = local.db_port
      to_port     = local.db_port
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
    }
  }

  dynamic "ingress" {
    for_each = var.allowed_security_group_ids
    content {
      from_port                = local.db_port
      to_port                  = local.db_port
      protocol                 = "tcp"
      source_security_group_id = ingress.value
    }
  }

  tags = local.tags
}

locals {
  db_port = 5432
}

resource "aws_db_instance" "main" {
  identifier             = var.identifier
  engine                 = "postgres"
  engine_version         = var.engine_version
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = var.max_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name  = var.database_name
  username = var.username
  password = var.password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  multi_az               = var.multi_az
  deletion_protection    = var.deletion_protection
  skip_final_snapshot    = var.skip_final_snapshot
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window

  performance_insights_enabled = var.performance_insights_enabled
  monitoring_interval          = var.monitoring_interval
  monitoring_role_arn          = var.monitoring_interval > 0 ? aws_iam_role.rds_enhanced_monitoring[0].arn : null

  tags = merge(local.tags, { Name = var.identifier })
}

resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0
  name  = "${var.identifier}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count      = var.monitoring_interval > 0 ? 1 : 0
  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## outputs.tf

```hcl
output "endpoint"         { value = aws_db_instance.main.endpoint }
output "port"             { value = aws_db_instance.main.port }
output "database_name"    { value = aws_db_instance.main.db_name }
output "username"         { value = aws_db_instance.main.username }
output "security_group_id" { value = aws_security_group.db.id }
output "instance_id"      { value = aws_db_instance.main.id }
```

## Conclusion

This PostgreSQL database module encapsulates the core RDS complexity behind a clean interface. Key design decisions: storage is always encrypted and uses GP3, the security group is managed by the module for consistent access control, and enhanced monitoring is conditionally enabled based on the monitoring_interval variable.
