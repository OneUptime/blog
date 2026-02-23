# How to Implement RDS Security Best Practices with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, RDS, AWS, Database

Description: A thorough guide to securing AWS RDS instances with Terraform, covering encryption, network isolation, authentication, monitoring, and backup strategies.

---

Databases hold your most valuable data, and RDS instances are often the crown jewels of an AWS environment. A compromised database can mean leaked customer data, regulatory fines, and serious reputational damage. Terraform lets you codify all your RDS security settings so they are consistent, reviewable, and enforceable across every environment.

This guide covers the full spectrum of RDS security best practices implemented in Terraform.

## Network Isolation

The first rule of database security: your database should never be publicly accessible. Place it in private subnets with no route to the internet.

```hcl
# DB subnet group using private subnets only
resource "aws_db_subnet_group" "main" {
  name       = "production-db-subnet"
  subnet_ids = aws_subnet.data[*].id  # Data-tier subnets

  tags = {
    Name = "production-db-subnet"
  }
}

# Security group for RDS - minimal access
resource "aws_security_group" "rds" {
  name        = "rds-sg"
  description = "Security group for RDS instances"
  vpc_id      = aws_vpc.main.id

  # Only allow connections from application security group
  ingress {
    description     = "PostgreSQL from application servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  # No egress rules needed for most databases

  tags = {
    Name = "rds-sg"
  }
}
```

## Encryption at Rest and in Transit

```hcl
# Parameter group requiring SSL
resource "aws_db_parameter_group" "postgres" {
  family = "postgres15"
  name   = "production-postgres"

  # Force SSL connections
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Additional security-related parameters
  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"  # Log all DDL statements
  }

  parameter {
    name  = "password_encryption"
    value = "scram-sha-256"
  }
}

resource "aws_db_instance" "main" {
  identifier = "production-db"

  # Engine
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.r6g.large"
  allocated_storage    = 100
  max_allocated_storage = 500  # Auto-scaling

  # Encryption
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  port                   = 5432

  # Use the SSL-enforcing parameter group
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Authentication
  username                            = var.db_username
  manage_master_user_password         = true  # Let RDS manage the password in Secrets Manager
  iam_database_authentication_enabled = true

  # Backup and recovery
  backup_retention_period   = 14
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot     = true
  delete_automated_backups  = false
  final_snapshot_identifier = "production-db-final-${formatdate("YYYY-MM-DD", timestamp())}"
  skip_final_snapshot       = false

  # Monitoring
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn
  performance_insights_retention_period = 731  # 2 years

  # Logging
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Maintenance
  auto_minor_version_upgrade = true
  deletion_protection        = true

  # Multi-AZ for production
  multi_az = true

  tags = {
    Name        = "production-db"
    Environment = "production"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## IAM Database Authentication

IAM authentication eliminates the need to manage database passwords for application access:

```hcl
# IAM policy for database access
resource "aws_iam_policy" "rds_connect" {
  name        = "rds-db-connect"
  description = "Allow IAM authentication to RDS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "rds-db:connect"
        Resource = "arn:aws:rds-db:${var.region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.main.resource_id}/app_user"
      }
    ]
  })
}

# Attach to the application role
resource "aws_iam_role_policy_attachment" "app_rds" {
  role       = aws_iam_role.application.name
  policy_arn = aws_iam_policy.rds_connect.arn
}
```

Applications use temporary IAM tokens instead of static passwords:

```bash
# Generate a temporary authentication token
TOKEN=$(aws rds generate-db-auth-token \
  --hostname production-db.cluster-xyz.us-east-1.rds.amazonaws.com \
  --port 5432 \
  --username app_user)

# Connect with the token
psql "host=production-db.cluster-xyz.us-east-1.rds.amazonaws.com \
      port=5432 dbname=myapp user=app_user password=$TOKEN sslmode=require"
```

## RDS Proxy for Connection Management

RDS Proxy adds a layer of security between your applications and the database:

```hcl
resource "aws_db_proxy" "main" {
  name                   = "production-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_security_group_ids = [aws_security_group.rds_proxy.id]
  vpc_subnet_ids         = aws_subnet.data[*].id

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "REQUIRED"
    secret_arn  = aws_db_instance.main.master_user_secret[0].secret_arn
  }

  tags = {
    Name = "production-proxy"
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    max_connections_percent = 80
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "main" {
  db_instance_identifier = aws_db_instance.main.identifier
  db_proxy_name          = aws_db_proxy.main.name
  target_group_name      = aws_db_proxy_default_target_group.main.name
}
```

## Event Subscriptions and Alerting

Get notified about important RDS events:

```hcl
resource "aws_db_event_subscription" "critical" {
  name      = "rds-critical-events"
  sns_topic = aws_sns_topic.database_alerts.arn

  source_type = "db-instance"
  source_ids  = [aws_db_instance.main.identifier]

  event_categories = [
    "availability",
    "deletion",
    "failover",
    "failure",
    "security",
    "configuration change"
  ]
}

# CloudWatch alarms for database monitoring
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is above 80%"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.database_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "free_storage" {
  alarm_name          = "rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240  # 10 GB in bytes
  alarm_description   = "RDS free storage is below 10 GB"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.database_alerts.arn]
}
```

## Automated Backups and Cross-Region Replication

```hcl
# Cross-region backup for disaster recovery
resource "aws_db_instance_automated_backups_replication" "main" {
  source_db_instance_arn = aws_db_instance.main.arn
  kms_key_id             = aws_kms_key.rds_dr.arn  # KMS key in DR region
  retention_period       = 14

  provider = aws.dr_region  # Provider alias for the DR region
}
```

## Audit Logging

Enable comprehensive audit logging:

```hcl
# For PostgreSQL, use pgAudit extension
resource "aws_db_parameter_group" "postgres_audit" {
  family = "postgres15"
  name   = "production-postgres-audit"

  parameter {
    name  = "shared_preload_libraries"
    value = "pgaudit"
  }

  parameter {
    name  = "pgaudit.log"
    value = "all"
  }

  parameter {
    name  = "pgaudit.role"
    value = "rds_pgaudit"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}
```

## Wrapping Up

RDS security is a combination of network isolation, encryption, authentication, monitoring, and backup practices. The most important settings are: never make it publicly accessible, encrypt everything, enforce SSL, enable IAM authentication, and set up monitoring. Use Terraform modules to package these settings so every database in your organization starts from a secure baseline.

For monitoring your databases and overall infrastructure, [OneUptime](https://oneuptime.com) offers comprehensive monitoring, alerting, and incident management to help you detect and respond to database issues quickly.
