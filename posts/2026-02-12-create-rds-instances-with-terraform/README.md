# How to Create RDS Instances with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, RDS, Database

Description: A hands-on guide to provisioning and configuring Amazon RDS database instances with Terraform, covering security, backups, monitoring, and high availability.

---

Databases are the heart of most applications, and getting them right is crucial. Amazon RDS takes the operational burden off your plate - no patching, no backup scripts, no failover configuration. But you still need to make smart choices about instance sizes, security groups, parameter groups, and backup strategies. Terraform helps you encode all those decisions in version-controlled configuration.

In this post, we'll walk through creating RDS instances with Terraform, from a simple development database to a production-ready setup with multi-AZ, encryption, and automated backups.

## Subnet Group

RDS instances need to know which subnets they can run in. You define this with a DB subnet group.

This creates a subnet group spanning multiple availability zones for high availability:

```hcl
# DB subnet group - defines which subnets RDS can use
resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name      = "Main DB Subnet Group"
    ManagedBy = "terraform"
  }
}
```

Always use private subnets for your databases. There's almost never a good reason to put a database in a public subnet.

## Security Group

The security group controls network access to your database. Lock it down to only the sources that need access.

This security group allows PostgreSQL connections only from your application's security group:

```hcl
# Security group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = var.vpc_id
  description = "Security group for RDS PostgreSQL"

  # Allow inbound from application servers only
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "PostgreSQL from app servers"
  }

  # No outbound restrictions needed for RDS
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "rds-security-group"
    ManagedBy = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Basic RDS Instance

Here's a straightforward PostgreSQL RDS instance suitable for development:

```hcl
# Development RDS instance
resource "aws_db_instance" "dev" {
  identifier = "myapp-dev-db"

  # Engine configuration
  engine         = "postgres"
  engine_version = "16.2"

  # Instance size
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp3"

  # Database configuration
  db_name  = "myapp"
  username = "dbadmin"
  password = var.db_password

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backups
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Don't create a final snapshot when destroying (dev only!)
  skip_final_snapshot = true

  tags = {
    Environment = "development"
    ManagedBy   = "terraform"
  }
}
```

A few important notes on this configuration: Never set `publicly_accessible = true` unless you have a very specific reason. The `skip_final_snapshot = true` is fine for dev environments but should be false in production. Also, don't hardcode the password - use a variable or better yet, pull it from Secrets Manager.

## Production-Ready RDS Instance

Production databases need encryption, multi-AZ, proper backups, and monitoring. Here's the full setup:

```hcl
# Production RDS instance with all the bells and whistles
resource "aws_db_instance" "production" {
  identifier = "myapp-prod-db"

  # Engine
  engine         = "postgres"
  engine_version = "16.2"

  # Size - start here and scale up as needed
  instance_class        = "db.r6g.large"
  allocated_storage     = 100
  max_allocated_storage = 500  # Enable storage autoscaling
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  # Database config
  db_name  = "myapp"
  username = "dbadmin"

  # Use Secrets Manager for the password
  manage_master_user_password = true

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High availability
  multi_az = true

  # Backups
  backup_retention_period   = 30
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot     = true
  delete_automated_backups  = false
  final_snapshot_identifier = "myapp-prod-final-${formatdate("YYYY-MM-DD", timestamp())}"

  # Monitoring
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  # Protection
  deletion_protection = true

  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgres16.name

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

The `manage_master_user_password = true` option is relatively new and fantastic - it tells RDS to manage the master password in Secrets Manager automatically. No more worrying about password rotation.

## Parameter Groups

Parameter groups let you customize database engine settings. Don't use the default parameter group - create your own so you can modify settings later.

This parameter group tunes PostgreSQL for better logging and connection handling:

```hcl
# Custom parameter group for PostgreSQL
resource "aws_db_parameter_group" "postgres16" {
  family = "postgres16"
  name   = "myapp-postgres16"

  # Log slow queries
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  # Connection limits
  parameter {
    name  = "max_connections"
    value = "200"
  }

  # Enable query statistics
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  # Logging configuration
  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = {
    ManagedBy = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Enhanced Monitoring

Enhanced Monitoring needs an IAM role. Here's how to set it up:

```hcl
# IAM role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## Read Replicas

For read-heavy workloads, you can create read replicas that handle SELECT queries while the primary handles writes:

```hcl
# Read replica in the same region
resource "aws_db_instance" "read_replica" {
  identifier          = "myapp-prod-read-1"
  replicate_source_db = aws_db_instance.production.identifier

  instance_class = "db.r6g.large"
  storage_type   = "gp3"

  # Read replicas don't need multi-AZ (but can have it)
  multi_az = false

  # Replicas can have their own backup settings
  backup_retention_period = 0

  # Same security group
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Monitoring
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true

  tags = {
    Environment = "production"
    Role        = "read-replica"
    ManagedBy   = "terraform"
  }
}
```

## Outputs

Export useful information so other Terraform configurations or applications can reference the database:

```hcl
output "db_endpoint" {
  description = "The connection endpoint for the database"
  value       = aws_db_instance.production.endpoint
}

output "db_name" {
  description = "The database name"
  value       = aws_db_instance.production.db_name
}

output "db_port" {
  description = "The database port"
  value       = aws_db_instance.production.port
}
```

## Common Pitfalls

**Password in state file.** Even with variables, Terraform stores the password in the state file in plain text. Use `manage_master_user_password = true` or store your state file securely (encrypted S3 backend with restricted access).

**Changing the engine version.** Upgrading the engine version causes downtime. Plan it during maintenance windows and test on a non-production instance first.

**Storage autoscaling surprises.** When `max_allocated_storage` is set, RDS can increase storage automatically. This is usually good, but it can surprise you on the bill if something is writing excessive data.

**Deletion protection.** Always enable `deletion_protection = true` for production databases. Terraform will require you to explicitly disable it before destroying the instance, which is exactly the kind of speed bump you want.

For monitoring your database performance and catching issues early, consider integrating with a proper observability platform. Check out our post on [infrastructure monitoring best practices](https://oneuptime.com/blog/post/2026-01-21-loki-vs-cloudwatch/view) for ideas.

## Wrapping Up

RDS with Terraform gives you reproducible, auditable database infrastructure. Start with the basics for development, then layer on multi-AZ, encryption, enhanced monitoring, and read replicas for production. The most important settings are encryption at rest, multi-AZ for availability, and proper backup retention. Get those right and you'll sleep a lot better at night.
