# How to Handle Database Restore from Snapshot in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Restore, Snapshot, RDS, Disaster Recovery

Description: Learn how to restore databases from snapshots using Terraform including RDS instances, Aurora clusters, and handling the restore workflow effectively.

---

Restoring a database from a snapshot is a critical operation that every team should practice before they actually need it. Whether you are recovering from a data corruption event, testing a migration rollback, or setting up a development environment with production data, understanding how to restore from snapshots in Terraform is essential. In this guide, we will walk through the process for different AWS database services.

## Understanding the Restore Process

When you restore a database from a snapshot in AWS, a new database instance or cluster is created with the data from the snapshot. The original database remains unchanged. This is an important distinction because Terraform manages the lifecycle of resources, and restoring from a snapshot creates a new resource rather than modifying the existing one.

The general workflow is: identify the snapshot you want to restore from, create a new database resource in Terraform that references that snapshot, apply the Terraform configuration to create the restored database, verify the data is correct, and then optionally swap the application to point at the restored database.

## Setting Up the Provider

```hcl
# Configure Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Restoring an RDS Instance from a Snapshot

To restore an RDS instance from a snapshot, use the `snapshot_identifier` parameter:

```hcl
# Look up an existing snapshot by identifier
data "aws_db_snapshot" "latest" {
  db_instance_identifier = "production-db"
  most_recent            = true
}

# Restore a new RDS instance from the snapshot
resource "aws_db_instance" "restored" {
  identifier     = "restored-db"
  instance_class = "db.r6g.large"

  # Reference the snapshot to restore from
  snapshot_identifier = data.aws_db_snapshot.latest.id

  # These settings override the snapshot values
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  # Storage settings (must be >= snapshot size)
  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"

  # You cannot change engine or engine_version during restore
  # They are inherited from the snapshot

  # Backup settings for the restored instance
  backup_retention_period = 7
  backup_window           = "02:00-03:00"
  copy_tags_to_snapshot   = true

  # Maintenance
  maintenance_window         = "sun:05:00-sun:06:00"
  auto_minor_version_upgrade = true

  # Security
  storage_encrypted = true
  multi_az          = true

  # Final snapshot configuration
  skip_final_snapshot = false
  final_snapshot_identifier = "restored-db-final"

  tags = {
    Environment  = "production"
    ManagedBy    = "terraform"
    RestoredFrom = data.aws_db_snapshot.latest.id
  }

  # Ignore changes to snapshot_identifier after initial creation
  lifecycle {
    ignore_changes = [snapshot_identifier]
  }
}
```

The `lifecycle` block with `ignore_changes` for `snapshot_identifier` is important. Without it, Terraform would try to recreate the instance every time you run `terraform plan` because the snapshot reference is only used during initial creation.

## Restoring an Aurora Cluster from a Snapshot

Aurora cluster restoration works similarly but uses cluster-level snapshots:

```hcl
# Find the latest Aurora cluster snapshot
data "aws_db_cluster_snapshot" "latest" {
  db_cluster_identifier = "production-aurora"
  most_recent           = true
}

# Restore an Aurora cluster from the snapshot
resource "aws_rds_cluster" "restored_aurora" {
  cluster_identifier = "restored-aurora"
  engine             = "aurora-postgresql"

  # Restore from the snapshot
  snapshot_identifier = data.aws_db_cluster_snapshot.latest.id

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  # Backup configuration
  backup_retention_period = 7
  preferred_backup_window = "02:00-03:00"

  # Security
  storage_encrypted = true

  skip_final_snapshot = false
  final_snapshot_identifier = "restored-aurora-final"

  tags = {
    Environment  = "production"
    ManagedBy    = "terraform"
    RestoredFrom = data.aws_db_cluster_snapshot.latest.id
  }

  lifecycle {
    ignore_changes = [snapshot_identifier]
  }
}

# Add instances to the restored cluster
resource "aws_rds_cluster_instance" "restored_instances" {
  count = 2

  identifier         = "restored-aurora-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.restored_aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.restored_aurora.engine
  engine_version     = aws_rds_cluster.restored_aurora.engine_version

  tags = {
    Environment = "production"
    Role        = count.index == 0 ? "primary" : "replica"
  }
}
```

## Restoring from a Specific Snapshot by Name

If you know the exact snapshot identifier:

```hcl
# Restore from a specific named snapshot
resource "aws_db_instance" "from_specific_snapshot" {
  identifier          = "restored-from-specific"
  instance_class      = "db.r6g.large"
  snapshot_identifier = "pre-migration-snapshot-2026-02-20"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  storage_encrypted     = true
  multi_az              = true
  skip_final_snapshot   = false
  final_snapshot_identifier = "restored-specific-final"

  tags = {
    Environment  = "production"
    RestoredFrom = "pre-migration-snapshot-2026-02-20"
  }

  lifecycle {
    ignore_changes = [snapshot_identifier]
  }
}
```

## Restoring with Modified Parameters

When restoring, you can change certain parameters to differ from the original:

```hcl
# Restore with different instance class and parameters
resource "aws_db_instance" "restored_modified" {
  identifier          = "restored-modified"
  snapshot_identifier = data.aws_db_snapshot.latest.id

  # Change the instance class (e.g., for testing with smaller instance)
  instance_class = "db.r6g.xlarge"  # Different from original

  # Use a different parameter group
  parameter_group_name = aws_db_parameter_group.restored_params.name

  # Network settings
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  # Enable additional features
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true

  storage_encrypted   = true
  multi_az            = true
  skip_final_snapshot = false
  final_snapshot_identifier = "restored-modified-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }

  lifecycle {
    ignore_changes = [snapshot_identifier]
  }
}

# Custom parameter group for the restored instance
resource "aws_db_parameter_group" "restored_params" {
  name   = "restored-db-params"
  family = "postgres15"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries slower than 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}
```

## Handling the Password After Restore

When you restore from a snapshot, the database keeps the master password from the original instance. To change it after restore:

```hcl
# Restore the instance first
resource "aws_db_instance" "restored_with_new_password" {
  identifier          = "restored-new-password"
  instance_class      = "db.r6g.large"
  snapshot_identifier = data.aws_db_snapshot.latest.id

  # Set a new master password
  password = var.new_db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "restored-new-pw-final"

  lifecycle {
    ignore_changes = [snapshot_identifier]
  }

  tags = {
    Environment = "production"
  }
}

variable "new_db_password" {
  type      = string
  sensitive = true
}
```

## Creating a Development Environment from Production Snapshot

A common use case is creating a development database from a production snapshot:

```hcl
# Fetch the latest production snapshot
data "aws_db_snapshot" "production_latest" {
  db_instance_identifier = "production-db"
  most_recent            = true
}

# Create a development instance from the production snapshot
resource "aws_db_instance" "dev_from_production" {
  identifier          = "dev-db"
  instance_class      = "db.t3.medium"  # Smaller instance for dev
  snapshot_identifier = data.aws_db_snapshot.production_latest.id

  # Development network configuration
  db_subnet_group_name   = aws_db_subnet_group.dev.name
  vpc_security_group_ids = [aws_security_group.dev_db_sg.id]

  # Reduced settings for development
  multi_az                = false  # No multi-AZ for dev
  backup_retention_period = 1     # Minimal backups

  # Allow deletion without final snapshot in dev
  skip_final_snapshot    = true
  deletion_protection    = false

  storage_encrypted = true

  tags = {
    Environment  = "development"
    ManagedBy    = "terraform"
    RestoredFrom = "production"
  }

  lifecycle {
    ignore_changes = [snapshot_identifier]
  }
}
```

## Automating Restore Testing

You can set up automated restore testing using Terraform and a CI/CD pipeline:

```hcl
# Variable to control restore testing
variable "restore_test_enabled" {
  description = "Whether to create a restore test instance"
  type        = bool
  default     = false
}

# Restore test instance (only created when enabled)
resource "aws_db_instance" "restore_test" {
  count = var.restore_test_enabled ? 1 : 0

  identifier          = "restore-test-${formatdate("YYYYMMDD", timestamp())}"
  instance_class      = "db.t3.medium"
  snapshot_identifier = data.aws_db_snapshot.latest.id

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  skip_final_snapshot = true  # No final snapshot needed for testing
  storage_encrypted   = true

  tags = {
    Environment = "testing"
    Purpose     = "restore-validation"
  }

  lifecycle {
    ignore_changes = [snapshot_identifier]
  }
}
```

## Monitoring Restored Databases

After restoring, monitor the new instance to ensure it is healthy:

```hcl
# CloudWatch alarm for the restored instance
resource "aws_cloudwatch_metric_alarm" "restored_db_cpu" {
  alarm_name          = "restored-db-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.restored.identifier
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

resource "aws_sns_topic" "db_alerts" {
  name = "restored-db-alerts"
}
```

For comprehensive monitoring of your database restore operations, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) provides dashboards to track instance health, performance metrics, and availability after restore.

## Best Practices

Always use the `lifecycle` block with `ignore_changes` for `snapshot_identifier` to prevent Terraform from trying to recreate the instance on subsequent applies. Test your restore process regularly in a non-production environment. When restoring for disaster recovery, verify data integrity before switching application traffic. Use tags to track which snapshot a restored instance came from. Change the master password after restoring if the original credentials may have been compromised. Monitor the restored instance closely during the first few hours to catch any performance issues.

## Conclusion

Restoring databases from snapshots in Terraform requires understanding the relationship between snapshot references and the Terraform lifecycle. The key is using `snapshot_identifier` for initial creation and `ignore_changes` to prevent unwanted recreation. Practice your restore process before you need it in an emergency, and use Terraform to make the process repeatable and documented.
