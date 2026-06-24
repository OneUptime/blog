# How to Deploy PostgreSQL on AWS RDS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, PostgreSQL, Database, Infrastructure as Code

Description: Learn how to provision a PostgreSQL RDS instance with extensions, parameter groups, and enhanced monitoring using OpenTofu.

---

AWS RDS PostgreSQL provides a fully managed PostgreSQL database with automated backups, patching, and optional Multi-AZ. OpenTofu lets you declare the RDS instance and core PostgreSQL configuration as code.

---

## Create the PostgreSQL RDS Instance

```hcl
resource "aws_db_instance" "postgres" {
  identifier        = "postgres-db"
  engine            = "postgres"
  engine_version    = "15.17"
  instance_class    = "db.t3.medium"
  allocated_storage = 100
  storage_type      = "gp3"
  storage_encrypted = true
  iops              = 3000

  db_name  = "appdb"
  username = "dbadmin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.postgres.id]
  parameter_group_name   = aws_db_parameter_group.postgres15.name

  multi_az                   = true
  publicly_accessible        = false
  auto_minor_version_upgrade = true
  deletion_protection        = true
  backup_retention_period    = 14
  backup_window              = "03:00-04:00"
  maintenance_window         = "Mon:05:00-Mon:06:00"
  skip_final_snapshot        = false
  final_snapshot_identifier  = "postgres-db-final"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Name        = "postgres-production"
    Environment = "production"
  }
}
```

---

## PostgreSQL Parameter Group

```hcl
resource "aws_db_parameter_group" "postgres15" {
  name   = "postgres15-custom"
  family = "postgres15"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
    apply_method = "immediate"
  }

  parameter {
    name  = "log_connections"
    value = "1"
    apply_method = "immediate"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "max_connections"
    value = "200"
    apply_method = "pending-reboot"
  }
}
```

---

## Security Group

```hcl
resource "aws_security_group" "postgres" {
  name   = "postgres-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}
```

---

## Outputs

```hcl
output "postgres_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "postgres_connection_string" {
  value     = "postgresql://${aws_db_instance.postgres.username}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"
  sensitive = true
}
```

---

## Summary

Create `aws_db_instance` with `engine = "postgres"`, `storage_encrypted = true`, and Performance Insights enabled for query analysis. Use a custom `aws_db_parameter_group` to configure slow query logging and keep `pg_stat_statements` explicit. Enable enhanced monitoring with `monitoring_interval = 60` for per-instance OS metrics.
