# How to Deploy MySQL on AWS RDS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, MySQL, Database, Infrastructure as Code

Description: Learn how to provision a MySQL RDS instance with parameter groups, subnet groups, and automated backups using OpenTofu.

---

AWS RDS MySQL provides a managed relational database with automated patching, backups, and Multi-AZ failover. OpenTofu lets you declare the entire MySQL stack - from networking to parameter tuning - as reproducible code.

---

## Create the MySQL RDS Instance

```hcl
resource "aws_db_instance" "mysql" {
  identifier        = "mysql-db"
  engine            = "mysql"
  engine_version    = "8.0"
  instance_class    = "db.t3.medium"
  allocated_storage = 50
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "appdb"
  username = "admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_mysql.id]
  parameter_group_name   = aws_db_parameter_group.mysql8.name

  multi_az                  = true
  publicly_accessible       = false
  deletion_protection       = true
  backup_retention_period   = 7
  backup_window             = "02:00-03:00"
  maintenance_window        = "Mon:03:00-Mon:04:00"
  skip_final_snapshot       = false
  final_snapshot_identifier = "mysql-final-snapshot"
  auto_minor_version_upgrade = true

  tags = {
    Name        = "mysql-production"
    Environment = "production"
  }
}
```

---

## MySQL Parameter Group

```hcl
resource "aws_db_parameter_group" "mysql8" {
  name   = "mysql80-custom"
  family = "mysql8.0"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "2"
  }

  parameter {
    name  = "max_connections"
    value = "300"
    apply_method = "pending-reboot"
  }
}
```

---

## Security Group for MySQL

```hcl
resource "aws_security_group" "rds_mysql" {
  name   = "rds-mysql-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}
```

---

## Output Connection Details

```hcl
output "mysql_endpoint" {
  value = aws_db_instance.mysql.endpoint
}

output "mysql_port" {
  value = aws_db_instance.mysql.port
}
```

---

## Summary

Create `aws_db_instance` with `engine = "mysql"` and a supported engine version. With `auto_minor_version_upgrade = true`, `engine_version = "8.0"` lets RDS use a supported MySQL 8.0 minor version. Set `storage_encrypted = true`, `deletion_protection = true`, and `backup_retention_period >= 7` for production databases. Create a custom `aws_db_parameter_group` for MySQL-specific tuning like `utf8mb4` character set and slow query logging.
