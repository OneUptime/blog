# How to Create RDS Read Replicas in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Read Replicas, Database, Scaling

Description: Learn how to create and manage Amazon RDS read replicas using Terraform to scale read-heavy workloads, including cross-region replicas and promotion strategies.

---

When your database is handling more reads than writes and the primary instance is starting to struggle, read replicas are the natural next step. Amazon RDS read replicas give you asynchronous copies of your primary database that can serve read traffic. Your application directs writes to the primary and reads to the replicas, spreading the load across multiple instances.

Terraform makes it easy to create and manage read replicas alongside your primary instance. This guide covers single-region replicas, cross-region replicas, cascading replicas, and what to do when you need to promote a replica to become standalone.

## How Read Replicas Work on RDS

A quick refresher before we jump into code. RDS read replicas use the database engine's native replication:

- **MySQL** uses binlog-based replication
- **PostgreSQL** uses streaming replication with WAL shipping
- **MariaDB** uses binlog-based replication

Replication is asynchronous, which means replicas can lag behind the primary by a few seconds (or more under heavy write loads). This is fine for most read workloads like dashboards, reports, and search, but not for reads that must see the very latest data.

## Creating a Basic Read Replica

The primary instance comes first. Then the replica references it:

```hcl
# The primary RDS instance
resource "aws_db_instance" "primary" {
  identifier = "myapp-primary"

  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "myapp"
  username = "app_admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  # Backups MUST be enabled for replicas to work
  # Retention period must be > 0
  backup_retention_period = 7
  backup_window           = "03:00-04:00"

  # For PostgreSQL replicas, enable replication
  # This happens automatically, but good to be explicit
  parameter_group_name = aws_db_parameter_group.primary.name

  multi_az            = true
  deletion_protection = true

  tags = {
    Name = "myapp-primary"
    Role = "primary"
  }
}

# Read replica - references the primary via replicate_source_db
resource "aws_db_instance" "replica" {
  identifier = "myapp-replica-1"

  # This is the key - point to the primary instance
  replicate_source_db = aws_db_instance.primary.identifier

  # Instance configuration for the replica
  instance_class = "db.r6g.large"
  storage_type   = "gp3"

  # Do NOT set these on a replica - they are inherited:
  # - engine, engine_version (inherited from source)
  # - db_name, username, password (inherited from source)
  # - allocated_storage (inherited from source)
  # - db_subnet_group_name (inherited from source)

  # You CAN customize these on the replica
  vpc_security_group_ids = [aws_security_group.db_replica.id]
  publicly_accessible    = false
  multi_az               = false  # Replicas can be Multi-AZ too, but often are not

  # Replicas do not need their own backups in most cases
  backup_retention_period = 0

  # Monitoring
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Use a different parameter group for replica-specific tuning
  parameter_group_name = aws_db_parameter_group.replica.name

  skip_final_snapshot = true  # Replicas usually do not need final snapshots

  tags = {
    Name = "myapp-replica-1"
    Role = "replica"
  }
}
```

## Multiple Read Replicas

For heavier read loads, create multiple replicas using `for_each` or `count`:

```hcl
# Create multiple read replicas
variable "replica_count" {
  description = "Number of read replicas"
  type        = number
  default     = 2
}

resource "aws_db_instance" "replicas" {
  count = var.replica_count

  identifier          = "myapp-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.primary.identifier

  instance_class = "db.r6g.large"
  storage_type   = "gp3"

  vpc_security_group_ids = [aws_security_group.db_replica.id]
  publicly_accessible    = false

  performance_insights_enabled = true
  parameter_group_name         = aws_db_parameter_group.replica.name

  backup_retention_period = 0
  skip_final_snapshot     = true

  tags = {
    Name  = "myapp-replica-${count.index + 1}"
    Role  = "replica"
    Index = count.index + 1
  }
}

# Output all replica endpoints
output "replica_endpoints" {
  description = "Endpoints for all read replicas"
  value       = aws_db_instance.replicas[*].endpoint
}
```

## Cross-Region Read Replicas

Cross-region replicas are useful for disaster recovery and for serving read traffic closer to users in other regions:

```hcl
# Provider for the replica region
provider "aws" {
  alias  = "replica_region"
  region = "eu-west-1"
}

# KMS key in the replica region for encryption
resource "aws_kms_key" "replica" {
  provider    = aws.replica_region
  description = "KMS key for cross-region RDS replica"

  tags = {
    Name = "rds-replica-key"
  }
}

# Subnet group in the replica region
resource "aws_db_subnet_group" "replica_region" {
  provider   = aws.replica_region
  name       = "replica-region-subnets"
  subnet_ids = var.replica_region_subnet_ids

  tags = {
    Name = "replica-region-db-subnets"
  }
}

# Cross-region read replica
resource "aws_db_instance" "cross_region_replica" {
  provider = aws.replica_region

  identifier          = "myapp-replica-eu"
  replicate_source_db = aws_db_instance.primary.arn  # Use ARN for cross-region

  instance_class = "db.r6g.large"
  storage_type   = "gp3"

  # Cross-region replicas need their own subnet group
  db_subnet_group_name   = aws_db_subnet_group.replica_region.name
  vpc_security_group_ids = [aws_security_group.db_replica_eu.id]

  # Encryption key in the replica region
  kms_key_id        = aws_kms_key.replica.arn
  storage_encrypted = true

  publicly_accessible     = false
  backup_retention_period = 7  # Enable backups if this might become primary
  skip_final_snapshot     = true

  tags = {
    Name   = "myapp-replica-eu"
    Role   = "cross-region-replica"
    Region = "eu-west-1"
  }
}
```

Note that for cross-region replicas you reference the primary by ARN, not by identifier. You also need to specify the subnet group explicitly since it cannot be inherited across regions.

## Parameter Groups for Replicas

Replicas can use different parameter groups than the primary. This is useful for tuning replicas for read-heavy workloads:

```hcl
# Parameter group for the primary instance
resource "aws_db_parameter_group" "primary" {
  name   = "myapp-primary-params"
  family = "postgres16"

  # Primary needs WAL settings for replication
  parameter {
    name  = "max_connections"
    value = "200"
  }
}

# Parameter group optimized for read replicas
resource "aws_db_parameter_group" "replica" {
  name   = "myapp-replica-params"
  family = "postgres16"

  # Replicas can have more connections since they handle reads
  parameter {
    name  = "max_connections"
    value = "400"
  }

  # Optimize for read-heavy workloads
  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  # Hot standby feedback helps avoid replication conflicts
  parameter {
    name  = "hot_standby_feedback"
    value = "1"
  }
}
```

## Monitoring Replica Lag

Replica lag is the most important metric to watch. If it grows too large, your reads are returning stale data:

```hcl
# CloudWatch alarm for replica lag
resource "aws_cloudwatch_metric_alarm" "replica_lag" {
  count = var.replica_count

  alarm_name          = "rds-replica-lag-${count.index + 1}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 30  # Alert if lag exceeds 30 seconds
  alarm_description   = "RDS replica lag is above 30 seconds"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.replicas[count.index].identifier
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]

  tags = {
    Name = "replica-lag-alarm-${count.index + 1}"
  }
}
```

## Promoting a Replica

When you need to promote a replica to become a standalone instance (for disaster recovery or splitting off a workload), you cannot do it through Terraform alone. Promotion is an operational action:

```bash
# Promote a replica to standalone
aws rds promote-read-replica \
  --db-instance-identifier myapp-replica-1

# After promotion, remove the replicate_source_db from Terraform
# and import the instance as a standalone resource
```

After promotion, update your Terraform configuration to remove `replicate_source_db` and run `terraform plan` to reconcile the state.

## Outputs

```hcl
output "primary_endpoint" {
  description = "Primary instance endpoint (for writes)"
  value       = aws_db_instance.primary.endpoint
}

output "replica_endpoints" {
  description = "Read replica endpoints (for reads)"
  value       = aws_db_instance.replicas[*].endpoint
}

output "cross_region_replica_endpoint" {
  description = "Cross-region replica endpoint"
  value       = aws_db_instance.cross_region_replica.endpoint
}
```

## Application-Level Routing

Having replicas is only half the story. Your application needs to know which endpoint to use for reads versus writes. Most database drivers support this natively:

For PostgreSQL, connection strings can include multiple hosts. For MySQL, many ORMs have built-in read/write splitting. Alternatively, use Amazon RDS Proxy, which can route read queries to replicas automatically.

## Summary

Read replicas in Terraform are created by setting `replicate_source_db` on a new `aws_db_instance`. You can have up to 5 replicas per primary (15 for Aurora), and they can be in different regions for disaster recovery. The main things to remember are: backups must be enabled on the primary, replication is asynchronous so monitor lag, and replica parameter groups should be tuned for read-heavy workloads. For more about monitoring your database, check out our post on [configuring RDS monitoring in Terraform](https://oneuptime.com/blog/post/2026-02-23-configure-rds-monitoring-in-terraform/view).
