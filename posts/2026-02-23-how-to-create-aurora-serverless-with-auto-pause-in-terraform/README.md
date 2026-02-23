# How to Create Aurora Serverless with Auto-Pause in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Aurora Serverless, Database, Cost Optimization, Infrastructure as Code

Description: Learn how to create Aurora Serverless v2 with auto-scaling in Terraform for cost-effective database workloads that scale automatically based on demand.

---

Aurora Serverless automatically adjusts database capacity based on your application's needs, scaling up during traffic spikes and scaling down during quiet periods. This makes it ideal for development environments, variable workloads, and applications with unpredictable traffic patterns. This guide covers creating Aurora Serverless with Terraform, including capacity configuration, scaling policies, and cost optimization.

## Aurora Serverless v1 vs v2

Aurora Serverless v1 introduced the concept of auto-pausing, where the database could scale to zero ACUs (Aurora Capacity Units) and pause entirely when idle, resuming automatically when connections arrive. However, v1 had limitations including a cold start delay of up to 30 seconds.

Aurora Serverless v2 is the current recommended version. It scales more granularly (in 0.5 ACU increments), responds to load changes in milliseconds rather than seconds, and supports more Aurora features. However, v2 does not support scaling to zero - the minimum is 0.5 ACU.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC with private subnets. Aurora Serverless v2 supports both MySQL-compatible and PostgreSQL-compatible engines.

## Aurora Serverless v2 Cluster

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC and networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "aurora-serverless-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${count.index + 1}"
  }
}

resource "aws_db_subnet_group" "aurora" {
  name       = "aurora-serverless-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "aurora-serverless-subnet-group"
  }
}

resource "aws_security_group" "aurora" {
  name_prefix = "aurora-serverless-"
  vpc_id      = aws_vpc.main.id
  description = "Aurora Serverless security group"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "PostgreSQL from VPC"
  }

  tags = {
    Name = "aurora-serverless-sg"
  }
}

# Aurora Serverless v2 Cluster (PostgreSQL)
resource "aws_rds_cluster" "serverless" {
  cluster_identifier = "aurora-serverless-postgres"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"  # v2 uses provisioned mode with serverless instances
  engine_version     = "15.4"

  database_name   = "appdb"
  master_username = "admin"
  master_password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  # Serverless v2 scaling configuration
  serverlessv2_scaling_configuration {
    min_capacity = 0.5   # Minimum 0.5 ACU (lowest possible for v2)
    max_capacity = 16.0  # Maximum 16 ACU (adjust based on workload)
  }

  storage_encrypted = true
  storage_type      = "aurora"

  backup_retention_period = 14
  preferred_backup_window = "03:00-04:00"

  # Enable deletion protection in production
  deletion_protection = false

  skip_final_snapshot       = false
  final_snapshot_identifier = "aurora-serverless-final"

  tags = {
    Name        = "aurora-serverless-postgres"
    Environment = "production"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}

# Serverless v2 writer instance
resource "aws_rds_cluster_instance" "writer" {
  cluster_identifier = aws_rds_cluster.serverless.id
  identifier         = "aurora-serverless-writer"
  instance_class     = "db.serverless"  # This is the key - use db.serverless class
  engine             = aws_rds_cluster.serverless.engine
  engine_version     = aws_rds_cluster.serverless.engine_version

  performance_insights_enabled = true

  tags = {
    Name = "aurora-serverless-writer"
    Role = "writer"
  }
}

# Serverless v2 reader instance (for read scaling)
resource "aws_rds_cluster_instance" "reader" {
  cluster_identifier = aws_rds_cluster.serverless.id
  identifier         = "aurora-serverless-reader"
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.serverless.engine
  engine_version     = aws_rds_cluster.serverless.engine_version

  performance_insights_enabled = true

  tags = {
    Name = "aurora-serverless-reader"
    Role = "reader"
  }
}
```

## Aurora Serverless v2 with MySQL

```hcl
# Aurora Serverless v2 Cluster (MySQL)
resource "aws_rds_cluster" "serverless_mysql" {
  cluster_identifier = "aurora-serverless-mysql"
  engine             = "aurora-mysql"
  engine_mode        = "provisioned"
  engine_version     = "3.04.0"  # Aurora MySQL 3.x is MySQL 8.0 compatible

  database_name   = "appdb"
  master_username = "admin"
  master_password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 32.0  # Higher max for demanding MySQL workloads
  }

  storage_encrypted = true

  backup_retention_period = 14
  skip_final_snapshot     = true

  tags = {
    Name = "aurora-serverless-mysql"
  }
}

resource "aws_rds_cluster_instance" "mysql_writer" {
  cluster_identifier = aws_rds_cluster.serverless_mysql.id
  identifier         = "mysql-serverless-writer"
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.serverless_mysql.engine
  engine_version     = aws_rds_cluster.serverless_mysql.engine_version
}
```

## Development Environment with Minimum Cost

For development environments, minimize costs with the lowest capacity settings.

```hcl
# Ultra-low-cost development cluster
resource "aws_rds_cluster" "dev" {
  cluster_identifier = "dev-aurora-serverless"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = "15.4"

  database_name   = "devdb"
  master_username = "admin"
  master_password = var.dev_db_password

  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5  # Absolute minimum (about $43/month if running 24/7)
    max_capacity = 2.0  # Cap growth for cost control
  }

  storage_encrypted = true

  # Shorter backup retention for dev
  backup_retention_period = 1
  skip_final_snapshot     = true

  # No deletion protection in dev
  deletion_protection = false

  tags = {
    Name        = "dev-aurora-serverless"
    Environment = "development"
  }
}

resource "aws_rds_cluster_instance" "dev_writer" {
  cluster_identifier = aws_rds_cluster.dev.id
  identifier         = "dev-serverless-writer"
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.dev.engine
  engine_version     = aws_rds_cluster.dev.engine_version
}

variable "dev_db_password" {
  type      = string
  sensitive = true
}
```

## Custom Parameter Group for Aurora Serverless

```hcl
# Cluster parameter group for Aurora Serverless
resource "aws_rds_cluster_parameter_group" "serverless" {
  name        = "aurora-serverless-params"
  family      = "aurora-postgresql15"
  description = "Parameters for Aurora Serverless v2"

  parameter {
    name  = "log_min_duration_statement"
    value = "2000"  # Log queries over 2 seconds
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name = "aurora-serverless-params"
  }
}
```

## Monitoring Aurora Serverless Scaling

```hcl
# Alarm when capacity reaches maximum
resource "aws_cloudwatch_metric_alarm" "max_capacity" {
  alarm_name          = "aurora-serverless-at-max-capacity"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "ServerlessDatabaseCapacity"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 16  # Match your max_capacity setting
  alarm_description   = "Aurora Serverless is running at maximum capacity"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.serverless.cluster_identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

# Monitor ACU utilization for cost awareness
resource "aws_cloudwatch_metric_alarm" "acu_utilization" {
  alarm_name          = "aurora-serverless-high-acu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 6  # 30 minutes of sustained high usage
  metric_name         = "ACUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Aurora Serverless ACU utilization above 90% - consider increasing max capacity"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.serverless.cluster_identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

resource "aws_sns_topic" "db_alerts" {
  name = "aurora-serverless-alerts"
}
```

## Outputs

```hcl
output "cluster_endpoint" {
  description = "Aurora cluster endpoint (read-write)"
  value       = aws_rds_cluster.serverless.endpoint
}

output "reader_endpoint" {
  description = "Aurora reader endpoint (read-only)"
  value       = aws_rds_cluster.serverless.reader_endpoint
}

output "cluster_id" {
  description = "Aurora cluster identifier"
  value       = aws_rds_cluster.serverless.cluster_identifier
}

output "scaling_config" {
  description = "Serverless scaling configuration"
  value = {
    min_acu = aws_rds_cluster.serverless.serverlessv2_scaling_configuration[0].min_capacity
    max_acu = aws_rds_cluster.serverless.serverlessv2_scaling_configuration[0].max_capacity
  }
}
```

## Conclusion

Aurora Serverless v2 provides automatic scaling that matches your workload, eliminating the need to manually choose and resize instance classes. With Terraform, you can configure the scaling boundaries, set up monitoring for capacity utilization, and maintain consistent configurations across environments. For development workloads, the 0.5 ACU minimum provides significant cost savings, while production workloads benefit from near-instant scaling to handle traffic spikes.

For more Aurora topics, see our guide on [How to Create Aurora Global Database with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-aurora-global-database-with-terraform/view).
