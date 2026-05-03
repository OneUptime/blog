# How to Create RDS Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, AWS, RDS, Terraform, IaC, DevOps

Description: Learn how to create AWS RDS database instances with OpenTofu, including subnet groups, parameter groups, security groups, and production-ready configuration.

## Introduction

Creating a production-ready RDS instance with OpenTofu involves the instance itself plus several supporting resources: a DB subnet group (for VPC placement), a parameter group (for database configuration), a security group (for access control), and credentials management. This guide covers the full setup for PostgreSQL RDS.

## DB Subnet Group

RDS requires a subnet group to specify which VPC subnets it can use:

```hcl
resource "aws_db_subnet_group" "main" {
  name        = "${var.environment}-db-subnet-group"
  description = "Database subnet group for ${var.environment}"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name        = "${var.environment}-db-subnet-group"
    Environment = var.environment
  }
}
```

## Security Group for RDS

```hcl
resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds-sg"
  description = "Security group for RDS instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app instances"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.environment}-rds-sg" }
}
```

## Parameter Group

```hcl
resource "aws_db_parameter_group" "postgres" {
  name        = "${var.environment}-postgres-params"
  family      = "postgres14"
  description = "PostgreSQL 14 parameter group"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}
```

## RDS Instance

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.environment}-database"
  engine         = "postgres"
  engine_version = "14.10"
  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100  # Enable storage autoscaling
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  # High availability
  multi_az = var.environment == "production"

  # Backups
  backup_retention_period   = var.environment == "production" ? 30 : 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "sun:04:00-sun:05:00"
  copy_tags_to_snapshot     = true

  # Configuration
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Protection
  deletion_protection     = var.environment == "production"
  skip_final_snapshot     = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.environment}-final-snapshot" : null

  # Monitoring
  performance_insights_enabled          = var.environment == "production"
  performance_insights_retention_period = 7

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name        = "${var.environment}-database"
    Environment = var.environment
  }
}
```

## Store Password in Secrets Manager

```hcl
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.environment}/database/password"
  description             = "RDS database password"
  recovery_window_in_days = 0  # Immediate deletion allowed in non-prod
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}
```

## Outputs

```hcl
output "db_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "db_address" {
  value     = aws_db_instance.main.address
  sensitive = true
}

output "db_port" {
  value = aws_db_instance.main.port
}

output "db_name" {
  value = aws_db_instance.main.db_name
}

output "db_arn" {
  value = aws_db_instance.main.arn
}
```

## Conclusion

A production RDS instance requires a DB subnet group, security group, parameter group, and the instance itself. Always enable encryption, backups, and deletion protection in production. Use `multi_az = true` for high availability. Store credentials in AWS Secrets Manager instead of outputs. Configure Performance Insights and CloudWatch log exports for observability. Use `max_allocated_storage` to enable automatic storage scaling as your database grows.
