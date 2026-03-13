# How to Handle Database Migration with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database Migrations, DMS, RDS, Infrastructure as Code

Description: Learn how to handle database migrations with Terraform using AWS DMS, Blue-Green deployments, and schema migration strategies for safe and repeatable database changes.

---

Database migration is one of the most challenging aspects of infrastructure management. Whether you are migrating from on-premises to AWS, between database engines, upgrading major versions, or restructuring your database architecture, Terraform can automate and standardize the process. This guide covers using Terraform for database migrations with AWS Database Migration Service (DMS), Blue-Green deployments, and schema migration strategies.

## Types of Database Migrations

Database migrations generally fall into several categories. Engine migration involves moving from one database engine to another (for example, Oracle to PostgreSQL). Version upgrade means moving to a newer version of the same engine. Cloud migration is moving from on-premises or another cloud to AWS. Schema migration refers to making structural changes to your database tables and objects. Architecture migration involves moving from single-instance to multi-AZ, or from RDS to Aurora.

Terraform excels at the infrastructure provisioning aspects of migration while complementary tools handle the data migration and schema changes.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, source and target database configurations, and understanding of your data migration requirements.

## AWS DMS Infrastructure with Terraform

AWS Database Migration Service handles the actual data transfer. Terraform provisions the DMS infrastructure.

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC and networking for DMS
resource "aws_vpc" "migration" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "migration-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.migration.id
  cidr_block        = cidrsubnet(aws_vpc.migration.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "migration-private-${count.index + 1}"
  }
}

# DMS subnet group
resource "aws_dms_replication_subnet_group" "main" {
  replication_subnet_group_description = "DMS replication subnet group"
  replication_subnet_group_id          = "dms-replication-subnet-group"

  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "dms-subnet-group"
  }
}

# Security group for DMS
resource "aws_security_group" "dms" {
  name_prefix = "dms-"
  vpc_id      = aws_vpc.migration.id
  description = "Security group for DMS replication instance"

  # Allow outbound to source database
  egress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "MySQL source"
  }

  # Allow outbound to target database
  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.migration.cidr_block]
    description = "PostgreSQL target"
  }

  # Allow outbound HTTPS for AWS APIs
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS for AWS APIs"
  }

  tags = {
    Name = "dms-sg"
  }
}
```

## DMS Replication Instance

```hcl
# DMS replication instance
resource "aws_dms_replication_instance" "main" {
  replication_instance_id    = "database-migration"
  replication_instance_class = "dms.r5.large"
  allocated_storage          = 100

  # Network configuration
  replication_subnet_group_id = aws_dms_replication_subnet_group.main.id
  vpc_security_group_ids      = [aws_security_group.dms.id]

  # Multi-AZ for production migrations
  multi_az            = true
  publicly_accessible = false

  # Engine version
  engine_version = "3.5.1"

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name    = "database-migration-instance"
    Purpose = "mysql-to-postgres-migration"
  }
}
```

## DMS Source and Target Endpoints

```hcl
# Source endpoint (MySQL on-premises or existing RDS)
resource "aws_dms_endpoint" "source" {
  endpoint_id   = "mysql-source"
  endpoint_type = "source"
  engine_name   = "mysql"

  server_name = "source-mysql.example.com"
  port        = 3306
  username    = var.source_db_username
  password    = var.source_db_password

  database_name = "production_db"

  # SSL settings for secure connection
  ssl_mode = "require"

  tags = {
    Name = "mysql-source-endpoint"
  }
}

# Target endpoint (PostgreSQL on RDS)
resource "aws_dms_endpoint" "target" {
  endpoint_id   = "postgres-target"
  endpoint_type = "target"
  engine_name   = "postgres"

  server_name = aws_db_instance.target.address
  port        = 5432
  username    = "admin"
  password    = var.target_db_password

  database_name = "appdb"

  # PostgreSQL-specific settings
  postgres_settings {
    after_connect_script  = "SET search_path TO public;"
    execute_timeout       = 60
    max_file_size         = 1048576
  }

  tags = {
    Name = "postgres-target-endpoint"
  }
}

variable "source_db_username" {
  type      = string
  sensitive = true
}

variable "source_db_password" {
  type      = string
  sensitive = true
}

variable "target_db_password" {
  type      = string
  sensitive = true
}
```

## DMS Migration Task

```hcl
# DMS replication task for full load + CDC
resource "aws_dms_replication_task" "migration" {
  replication_task_id      = "mysql-to-postgres-migration"
  replication_instance_arn = aws_dms_replication_instance.main.replication_instance_arn
  source_endpoint_arn      = aws_dms_endpoint.source.endpoint_arn
  target_endpoint_arn      = aws_dms_endpoint.target.endpoint_arn

  migration_type = "full-load-and-cdc"  # Full data copy + ongoing replication

  # Table mappings define which tables to migrate
  table_mappings = jsonencode({
    rules = [
      {
        rule-type = "selection"
        rule-id   = "1"
        rule-name = "migrate-all-tables"
        object-locator = {
          schema-name = "%"     # All schemas
          table-name  = "%"     # All tables
        }
        rule-action = "include"
      },
      {
        rule-type = "selection"
        rule-id   = "2"
        rule-name = "exclude-temp-tables"
        object-locator = {
          schema-name = "%"
          table-name  = "tmp_%"  # Exclude temporary tables
        }
        rule-action = "exclude"
      },
      {
        rule-type = "transformation"
        rule-id   = "3"
        rule-name = "convert-schema-name"
        rule-action = "rename"
        rule-target = "schema"
        object-locator = {
          schema-name = "production_db"
        }
        value = "public"  # Rename schema to public for PostgreSQL
      }
    ]
  })

  # Task settings
  replication_task_settings = jsonencode({
    TargetMetadata = {
      TargetSchema       = "public"
      SupportLobs        = true
      FullLobMode        = false
      LobChunkSize       = 64
      LimitedSizeLobMode = true
      LobMaxSize         = 32768
    }
    FullLoadSettings = {
      TargetTablePrepMode = "DROP_AND_CREATE"
      MaxFullLoadSubTasks = 8
      CommitRate          = 10000
    }
    Logging = {
      EnableLogging = true
      LogComponents = [
        { Id = "TRANSFORMATION", Severity = "LOGGER_SEVERITY_DEFAULT" },
        { Id = "SOURCE_UNLOAD", Severity = "LOGGER_SEVERITY_DEFAULT" },
        { Id = "TARGET_LOAD", Severity = "LOGGER_SEVERITY_DEFAULT" },
        { Id = "SOURCE_CAPTURE", Severity = "LOGGER_SEVERITY_DEFAULT" },
        { Id = "TARGET_APPLY", Severity = "LOGGER_SEVERITY_DEFAULT" }
      ]
    }
    ControlTablesSettings = {
      ControlSchema = "dms_control"
    }
    ErrorBehavior = {
      DataErrorPolicy         = "LOG_ERROR"
      DataTruncationErrorPolicy = "LOG_ERROR"
      DataErrorEscalationPolicy = "SUSPEND_TABLE"
      DataErrorEscalationCount  = 50
    }
  })

  tags = {
    Name = "mysql-to-postgres-migration"
  }
}
```

## Target Database Setup

```hcl
# Target RDS PostgreSQL instance
resource "aws_db_subnet_group" "target" {
  name       = "migration-target-subnets"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "target_rds" {
  name_prefix = "target-rds-"
  vpc_id      = aws_vpc.migration.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.dms.id]
    description     = "PostgreSQL from DMS"
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.migration.cidr_block]
    description = "PostgreSQL from VPC"
  }

  tags = {
    Name = "target-rds-sg"
  }
}

resource "aws_db_instance" "target" {
  identifier     = "migration-target-postgres"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 200
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "appdb"
  username = "admin"
  password = var.target_db_password

  db_subnet_group_name   = aws_db_subnet_group.target.name
  vpc_security_group_ids = [aws_security_group.target_rds.id]

  multi_az            = true
  publicly_accessible = false

  backup_retention_period = 14

  tags = {
    Name    = "migration-target-postgres"
    Purpose = "migration-target"
  }
}
```

## RDS Blue-Green Deployment

For in-place version upgrades or engine parameter changes, use Blue-Green deployments.

```hcl
# Blue-Green deployment for safe database updates
resource "aws_rds_blue_green_deployment" "upgrade" {
  blue_green_deployment_name = "postgres-upgrade"
  source_arn                 = aws_db_instance.target.arn

  target_engine_version            = "16"  # Upgrade to PostgreSQL 16
  target_db_parameter_group_name   = aws_db_parameter_group.pg16.name

  tags = {
    Name = "postgres-upgrade-bg"
  }
}

# New parameter group for the target version
resource "aws_db_parameter_group" "pg16" {
  name   = "postgres16-params"
  family = "postgres16"

  parameter {
    name  = "log_min_duration_statement"
    value = "2000"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Monitoring Migration Progress

```hcl
# CloudWatch alarms for DMS monitoring
resource "aws_cloudwatch_metric_alarm" "dms_latency" {
  alarm_name          = "dms-cdc-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CDCLatencySource"
  namespace           = "AWS/DMS"
  period              = 300
  statistic           = "Average"
  threshold           = 60  # 60 seconds CDC latency
  alarm_description   = "DMS CDC latency from source is high"

  dimensions = {
    ReplicationInstanceIdentifier = aws_dms_replication_instance.main.replication_instance_id
    ReplicationTaskIdentifier     = aws_dms_replication_task.migration.replication_task_id
  }
}

resource "aws_cloudwatch_metric_alarm" "dms_full_load" {
  alarm_name          = "dms-full-load-throughput"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FullLoadThroughputRowsSource"
  namespace           = "AWS/DMS"
  period              = 300
  statistic           = "Average"
  threshold           = 100  # Alert if throughput drops below 100 rows/sec
  alarm_description   = "DMS full load throughput is low"

  dimensions = {
    ReplicationInstanceIdentifier = aws_dms_replication_instance.main.replication_instance_id
    ReplicationTaskIdentifier     = aws_dms_replication_task.migration.replication_task_id
  }
}
```

## Schema Migration with Terraform Provisioners

While Terraform should not typically manage database schemas, you can use provisioners for initial setup.

```hcl
# Using null_resource to run schema migrations
resource "null_resource" "schema_migration" {
  triggers = {
    db_instance_id = aws_db_instance.target.id
    migration_hash = filemd5("${path.module}/migrations/latest.sql")
  }

  provisioner "local-exec" {
    command = <<-EOT
      PGPASSWORD=${var.target_db_password} psql \
        -h ${aws_db_instance.target.address} \
        -U admin \
        -d appdb \
        -f ${path.module}/migrations/latest.sql
    EOT

    environment = {
      PGPASSWORD = var.target_db_password
    }
  }

  depends_on = [aws_db_instance.target]
}
```

## Outputs

```hcl
output "dms_replication_instance_arn" {
  description = "DMS replication instance ARN"
  value       = aws_dms_replication_instance.main.replication_instance_arn
}

output "source_endpoint_arn" {
  description = "Source endpoint ARN"
  value       = aws_dms_endpoint.source.endpoint_arn
}

output "target_endpoint_arn" {
  description = "Target endpoint ARN"
  value       = aws_dms_endpoint.target.endpoint_arn
}

output "target_db_endpoint" {
  description = "Target database endpoint"
  value       = aws_db_instance.target.endpoint
}

output "migration_task_arn" {
  description = "DMS migration task ARN"
  value       = aws_dms_replication_task.migration.replication_task_arn
}
```

## Migration Best Practices

Always test migrations in a non-production environment first with a copy of production data. Use CDC (Change Data Capture) for zero-downtime migrations so the source database remains operational during migration. Validate data integrity after the full load completes and before cutting over.

Plan for rollback by keeping the source database operational until you are confident the migration succeeded. Use DMS validation to automatically compare source and target data.

Consider the order of operations - migrate the database infrastructure with Terraform, run the data migration with DMS, validate the data, switch application connections, and then decommission the source.

## Conclusion

Database migration is complex, but Terraform brings order to the infrastructure provisioning aspects. By codifying DMS replication instances, endpoints, and tasks in Terraform, you create repeatable migration patterns that can be tested in lower environments before running in production. Combined with Blue-Green deployments for in-place upgrades and proper monitoring, Terraform-managed migrations reduce risk and increase confidence.

For more database topics, check out our guide on [How to Create RDS Proxy with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-rds-proxy-with-terraform/view).
