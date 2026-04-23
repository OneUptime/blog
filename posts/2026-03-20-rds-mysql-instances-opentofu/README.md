# How to Create RDS MySQL Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, MySQL, Database, Infrastructure as Code, Production

Description: Learn how to create a production-ready RDS MySQL instance with Multi-AZ, encryption, automatic backups, and monitoring using OpenTofu.

## Introduction

Amazon RDS MySQL provides a managed relational database service with automated backups, patching, and failover. This guide covers creating a production-grade MySQL instance with security best practices including encryption, Multi-AZ deployment, and monitoring.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS and VPC permissions

## Step 1: Create RDS Subnet Group

```hcl
# RDS requires a subnet group spanning at least 2 AZs

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.project_name}-rds-subnet-group"
    Environment = var.environment
  }
}
```

## Step 2: Create Security Group for RDS

```hcl
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS MySQL"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MySQL from application servers"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-rds-sg" }
}
```

## Step 3: Create the RDS MySQL Instance

```hcl
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

resource "aws_db_instance" "mysql" {
  identifier     = "${var.project_name}-mysql"
  engine         = "mysql"
  engine_version = "8.0"

  instance_class = var.instance_class  # e.g., "db.t3.medium"
  storage_type   = "gp3"
  allocated_storage     = 100
  max_allocated_storage = 500  # Enable storage autoscaling up to 500 GiB

  db_name  = var.database_name
  username = var.master_username
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.mysql.name

  depends_on = [aws_iam_role_policy_attachment.rds_monitoring]

  # High availability
  multi_az = true

  # Encryption
  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  # Automated backups
  backup_retention_period = 7  # days
  backup_window           = "03:00-04:00"  # UTC
  maintenance_window      = "sun:04:00-sun:05:00"  # UTC

  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-mysql-final"

  # Enhanced monitoring
  monitoring_interval = 60  # seconds
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = var.kms_key_arn

  # Upgrades
  auto_minor_version_upgrade = true
  allow_major_version_upgrade = false

  tags = {
    Name        = "${var.project_name}-mysql"
    Environment = var.environment
    Engine      = "mysql-8.0"
  }
}
```

## Step 4: Create Parameter Group

```hcl
resource "aws_db_parameter_group" "mysql" {
  name   = "${var.project_name}-mysql-params"
  family = "mysql8.0"

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "1"  # Log queries slower than 1 second
  }

  parameter {
    name  = "max_connections"
    value = "500"
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

This configuration deploys a production-ready MySQL RDS instance with Multi-AZ failover, encryption at rest, automated backups, Enhanced Monitoring, and Performance Insights. It uses RDS-managed master credentials in Secrets Manager, keeps deletion protection enabled to prevent accidental database loss, and sets a maintenance window during low-traffic hours.
