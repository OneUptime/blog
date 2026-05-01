# How to Deploy MySQL on AWS RDS with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, MySQL, RDS, AWS, Database, Infrastructure as Code

Description: Learn how to deploy a production MySQL database on AWS RDS using OpenTofu - with InnoDB configuration, binary logging for replication, read replicas, and proper security controls.

## Introduction

MySQL on AWS RDS with OpenTofu requires subnet groups, InnoDB-optimized parameter groups, security groups, and for production workloads - read replicas for read scaling. This guide covers the full setup.

## Parameter Group for MySQL 8.0

```hcl
resource "aws_db_parameter_group" "mysql8" {
  name   = "${var.environment}-mysql8"
  family = "mysql8.0"

  parameter {
    name  = "innodb_buffer_pool_size"
    value = "{DBInstanceClassMemory*3/4}"  # 75% of instance memory
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "1"  # Log queries taking > 1 second
  }

  parameter {
    name  = "log_bin_trust_function_creators"
    value = "1"
  }

  parameter {
    name  = "max_connections"
    value = "500"
  }

  tags = { Environment = var.environment }
}
```

## Option Group for MySQL Features

```hcl
resource "aws_db_option_group" "mysql8" {
  name                     = "${var.environment}-mysql8"
  option_group_description = "MySQL 8.0 option group"
  engine_name              = "mysql"
  major_engine_version     = "8.0"

  # Enable MEMCACHED for InnoDB
  option {
    option_name = "MEMCACHED"
    port        = 11211

    option_settings {
      name  = "CHUNK_SIZE"
      value = "32"
    }
  }

  tags = { Environment = var.environment }
}
```

## Primary RDS Instance

```hcl
resource "aws_db_instance" "mysql" {
  identifier        = "${var.environment}-mysql"
  engine            = "mysql"
  engine_version    = "8.0"
  instance_class    = var.db_instance_class

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  db_name  = var.db_name
  username = var.db_admin_username
  password = var.db_admin_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.mysql8.name
  option_group_name      = aws_db_option_group.mysql8.name
  vpc_security_group_ids = [aws_security_group.mysql.id]

  # Enable binary logging for replication
  backup_retention_period = 7
  backup_window           = "02:00-03:00"
  maintenance_window      = "Sun:03:00-Sun:04:00"

  # Production settings
  multi_az            = var.environment == "prod"
  deletion_protection = var.environment == "prod"
  publicly_accessible = false

  # Enable enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  performance_insights_enabled = true

  tags = {
    Name        = "${var.environment}-mysql"
    Environment = var.environment
  }
}
```

## Read Replica

```hcl
resource "aws_db_instance" "mysql_read_replica" {
  count = var.environment == "prod" ? 1 : 0

  identifier          = "${var.environment}-mysql-read-replica"
  replicate_source_db = aws_db_instance.mysql.identifier

  instance_class    = var.read_replica_instance_class
  storage_encrypted = true

  # No db_name, username, password, or parameter group for same-Region replica - inherited from primary
  publicly_accessible = false
  multi_az            = false  # Set to true only if you need failover support for the replica itself

  vpc_security_group_ids = [aws_security_group.mysql.id]

  # Read replica backup settings
  backup_retention_period = 0  # Disable automated backups on replica

  performance_insights_enabled = true

  tags = {
    Name        = "${var.environment}-mysql-read-replica"
    Environment = var.environment
    Role        = "read-replica"
  }
}
```

## Enhanced Monitoring IAM Role

```hcl
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.environment}-rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## Outputs

```hcl
output "primary_endpoint" {
  value = aws_db_instance.mysql.endpoint
}

output "read_replica_endpoint" {
  value = var.environment == "prod" ? aws_db_instance.mysql_read_replica[0].endpoint : null
}

output "db_name" {
  value = aws_db_instance.mysql.db_name
}
```

## Conclusion

A production MySQL deployment on AWS RDS needs InnoDB-optimized parameter groups, binary logging enabled for potential replication, storage autoscaling for growth, and read replicas for read-heavy workloads. Use gp3 storage for baseline IOPS performance without additional cost. Enable Enhanced Monitoring for OS-level metrics and Performance Insights for query analysis. Set `deletion_protection = true` in production and always use Multi-AZ for HA.
