# How to Use the Terraform AWS RDS Module

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, RDS, Database

Description: Learn how to use the terraform-aws-modules/rds module to deploy production-ready RDS instances with encryption, backups, monitoring, and multi-AZ failover.

---

Setting up RDS properly involves a surprising amount of configuration - subnet groups, parameter groups, option groups, security groups, encryption, backups, monitoring, and multi-AZ failover. The `terraform-aws-modules/rds/aws` module handles all of this in a single, well-structured module call.

This guide shows you how to use the module for common database scenarios, from a simple development instance to a production-grade multi-AZ deployment.

## Basic PostgreSQL Instance

Let's start with a straightforward PostgreSQL setup suitable for development or small production workloads.

```hcl
module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.4.0"

  identifier = "my-app-db"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "16.2"
  family               = "postgres16"     # For parameter group
  major_engine_version = "16"             # For option group
  instance_class       = "db.t3.medium"

  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100   # Enable storage autoscaling up to 100 GB
  storage_type          = "gp3"
  storage_encrypted     = true

  # Database settings
  db_name  = "appdb"
  username = "dbadmin"
  port     = 5432

  # Network
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.db_security_group.security_group_id]
  publicly_accessible    = false

  # Backups
  backup_retention_period = 7
  backup_window           = "03:00-04:00"

  # Maintenance
  maintenance_window = "Mon:04:00-Mon:05:00"

  # Deletion protection
  deletion_protection = false  # Set to true for production
  skip_final_snapshot = false
  final_snapshot_identifier_prefix = "my-app-db-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Security Group for RDS

Create a security group that only allows traffic from your application.

```hcl
module "db_security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.0"

  name        = "my-app-db-sg"
  description = "Security group for the application database"
  vpc_id      = module.vpc.vpc_id

  # Allow PostgreSQL access from private subnets only
  ingress_with_cidr_blocks = [
    {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      description = "PostgreSQL from private subnets"
      cidr_blocks = join(",", module.vpc.private_subnets_cidr_blocks)
    },
  ]

  tags = {
    Name = "my-app-db-sg"
  }
}
```

## Production Multi-AZ Setup

For production, enable multi-AZ, Performance Insights, and enhanced monitoring.

```hcl
module "db_production" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.4.0"

  identifier = "production-db"

  engine               = "postgres"
  engine_version       = "16.2"
  family               = "postgres16"
  major_engine_version = "16"
  instance_class       = "db.r6g.large"  # Memory-optimized for production

  # Storage - provisioned IOPS for consistent performance
  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true
  # Optional: use a CMK for encryption
  # kms_key_id = aws_kms_key.rds.arn

  # Database settings
  db_name  = "appdb"
  username = "dbadmin"
  port     = 5432

  # High availability
  multi_az = true

  # Network
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.db_security_group.security_group_id]
  publicly_accessible    = false

  # Backups
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  copy_tags_to_snapshot   = true

  # Maintenance
  maintenance_window          = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false

  # Monitoring
  monitoring_interval = 30  # Enhanced monitoring every 30 seconds
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  performance_insights_enabled          = true
  performance_insights_retention_period = 7  # Free tier

  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier_prefix = "production-db-final"

  # Parameter group customization
  parameters = [
    {
      name  = "log_min_duration_statement"
      value = "1000"  # Log queries slower than 1 second
    },
    {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements"
    },
    {
      name  = "pg_stat_statements.track"
      value = "all"
    },
  ]

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Backup      = "daily"
  }
}
```

## IAM Role for Enhanced Monitoring

Enhanced monitoring needs an IAM role.

```hcl
resource "aws_iam_role" "rds_monitoring" {
  name = "rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## MySQL Configuration

Switching to MySQL is mostly a matter of changing engine properties.

```hcl
module "mysql_db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.4.0"

  identifier = "my-mysql-db"

  engine               = "mysql"
  engine_version       = "8.0.35"
  family               = "mysql8.0"
  major_engine_version = "8.0"
  instance_class       = "db.t3.medium"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "appdb"
  username = "dbadmin"
  port     = 3306

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.mysql_sg.security_group_id]
  publicly_accessible    = false

  backup_retention_period = 7
  deletion_protection     = false

  parameters = [
    {
      name  = "character_set_server"
      value = "utf8mb4"
    },
    {
      name  = "collation_server"
      value = "utf8mb4_unicode_ci"
    },
    {
      name  = "slow_query_log"
      value = "1"
    },
    {
      name  = "long_query_time"
      value = "1"
    },
  ]

  tags = {
    Environment = "staging"
  }
}
```

## Read Replicas

For read-heavy workloads, create read replicas to offload queries from the primary.

```hcl
module "db_replica" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.4.0"

  identifier = "production-db-replica"

  # Replicate from the primary instance
  replicate_source_db = module.db_production.db_instance_identifier

  engine               = "postgres"
  engine_version       = "16.2"
  family               = "postgres16"
  major_engine_version = "16"
  instance_class       = "db.r6g.large"

  # Replicas don't need their own subnet group or credentials
  # (inherited from primary)
  port = 5432

  multi_az            = false  # Replica doesn't need multi-AZ
  storage_encrypted   = true
  publicly_accessible = false

  # Replicas don't have their own backups
  backup_retention_period = 0
  skip_final_snapshot     = true

  vpc_security_group_ids = [module.db_security_group.security_group_id]

  tags = {
    Environment = "production"
    Role        = "read-replica"
  }
}
```

## Retrieving Credentials

The module stores the master password in AWS Secrets Manager by default. Access it in your application.

```hcl
# Output the connection details
output "db_endpoint" {
  value       = module.db.db_instance_endpoint
  description = "Database connection endpoint"
}

output "db_secret_arn" {
  value       = module.db.db_instance_master_user_secret_arn
  description = "ARN of the secret containing the master password"
  sensitive   = true
}
```

## Monitoring Your Database

RDS provides CloudWatch metrics, Enhanced Monitoring, and Performance Insights. But these only cover the database layer. For end-to-end monitoring that connects database performance to application behavior, pair RDS metrics with an observability platform like [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view).

Key metrics to watch:
- `CPUUtilization` - should stay below 80%
- `FreeableMemory` - low values indicate you need a bigger instance
- `DatabaseConnections` - approaching `max_connections` means trouble
- `ReadIOPS` / `WriteIOPS` - track I/O patterns for capacity planning

## Wrapping Up

The Terraform AWS RDS module takes the tedium out of database provisioning. Start with the basics, add multi-AZ and monitoring for production, and always enable encryption and automated backups. The module's parameters array makes it easy to tune database settings without creating a separate parameter group resource.

For the VPC layer underneath your database, see our guide on the [Terraform AWS VPC module](https://oneuptime.com/blog/post/2026-02-12-terraform-aws-vpc-module/view). For the application layer that connects to it, check out [creating Application Load Balancers with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-application-load-balancers-with-terraform/view).
