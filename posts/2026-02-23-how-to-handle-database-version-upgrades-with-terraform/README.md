# How to Handle Database Version Upgrades with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Upgrades, RDS, Aurora, Infrastructure as Code

Description: Learn how to safely manage database engine version upgrades using Terraform including planning, testing, and executing major and minor version upgrades.

---

Database engine upgrades are one of the most critical operations you will perform on your infrastructure. They bring security patches, performance improvements, and new features, but they also carry risk if not handled carefully. Terraform provides a structured way to manage these upgrades across your database fleet. In this guide, we will cover strategies for handling both minor and major version upgrades for AWS database services using Terraform.

## Understanding Version Upgrades

There are two types of version upgrades: minor and major. Minor version upgrades (for example, PostgreSQL 15.3 to 15.4) include bug fixes and security patches. They are generally backward compatible and can often be applied with minimal downtime. Major version upgrades (for example, PostgreSQL 14 to 15) include new features and potentially breaking changes. They require more careful planning and testing.

AWS handles these differently. Minor version upgrades can be applied automatically during your maintenance window if `auto_minor_version_upgrade` is enabled. Major version upgrades must be initiated explicitly and typically require more downtime.

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

## Managing Minor Version Upgrades

For minor versions, you can either let AWS handle them automatically or control them through Terraform:

```hcl
# Option 1: Automatic minor version upgrades
resource "aws_db_instance" "auto_upgrade" {
  identifier     = "auto-upgrade-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage = 100
  username          = "dbadmin"
  password          = var.db_password

  # Enable automatic minor version upgrades
  auto_minor_version_upgrade = true
  maintenance_window         = "sun:05:00-sun:05:30"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "auto-upgrade-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Option 2: Controlled minor version upgrades via Terraform
resource "aws_db_instance" "controlled_upgrade" {
  identifier     = "controlled-upgrade-db"
  engine         = "postgres"
  engine_version = "15.5"  # Change this to trigger the upgrade

  instance_class = "db.r6g.large"
  allocated_storage = 100
  username          = "dbadmin"
  password          = var.db_password

  # Disable automatic upgrades when managing versions through Terraform
  auto_minor_version_upgrade = false

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "controlled-upgrade-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Planning a Major Version Upgrade

Major version upgrades require more preparation. Here is a step-by-step approach:

```hcl
# Step 1: Check available upgrade targets
# Run: aws rds describe-db-engine-versions --engine postgres --engine-version 14.9

# Step 2: Create a snapshot before the upgrade
resource "aws_db_snapshot" "pre_upgrade" {
  db_instance_identifier = aws_db_instance.production.identifier
  db_snapshot_identifier = "pre-major-upgrade-snapshot"

  tags = {
    Purpose = "pre-major-version-upgrade"
    FromVersion = "14.9"
    ToVersion   = "15.4"
  }
}

# Step 3: Test the upgrade on a copy first
resource "aws_db_instance" "upgrade_test" {
  identifier          = "upgrade-test-db"
  instance_class      = "db.r6g.large"
  snapshot_identifier = aws_db_snapshot.pre_upgrade.id

  # Set the target major version
  engine         = "postgres"
  engine_version = "15.4"

  # Allow major version upgrades
  allow_major_version_upgrade = true

  db_subnet_group_name   = aws_db_subnet_group.test.name
  vpc_security_group_ids = [aws_security_group.test_sg.id]
  storage_encrypted      = true

  # This is a test instance, so we can skip the final snapshot
  skip_final_snapshot = true

  tags = {
    Environment = "testing"
    Purpose     = "upgrade-validation"
  }

  lifecycle {
    ignore_changes = [snapshot_identifier]
  }
}
```

## Executing the Major Version Upgrade

Once you have validated the upgrade on a test instance, apply it to production:

```hcl
# Production database with major version upgrade
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"  # Updated from 14.9

  instance_class    = "db.r6g.large"
  allocated_storage = 100
  username          = "dbadmin"
  password          = var.db_password

  # IMPORTANT: Must be true for major version upgrades
  allow_major_version_upgrade = true

  # Use a parameter group compatible with the new version
  parameter_group_name = aws_db_parameter_group.postgres15.name

  # Apply changes during the next maintenance window
  apply_immediately = false  # Set to true for immediate upgrade

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  multi_az               = true
  storage_encrypted      = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "production-db-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Parameter group for the new version
resource "aws_db_parameter_group" "postgres15" {
  name   = "postgres15-params"
  family = "postgres15"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Environment = "production"
  }
}
```

## Upgrading Aurora Clusters

Aurora cluster upgrades work at the cluster level:

```hcl
# Aurora cluster with major version upgrade
resource "aws_rds_cluster" "aurora" {
  cluster_identifier = "production-aurora"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"  # Updated from 14.9

  database_name   = "appdb"
  master_username = "dbadmin"
  master_password = var.db_password

  # Allow major version upgrades
  allow_major_version_upgrade = true

  # Use compatible parameter group
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora_pg15.name

  # Apply during maintenance window or immediately
  apply_immediately = false

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true

  backup_retention_period = 14
  skip_final_snapshot     = false
  final_snapshot_identifier = "aurora-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Aurora cluster parameter group for the new version
resource "aws_rds_cluster_parameter_group" "aurora_pg15" {
  name   = "aurora-pg15-cluster-params"
  family = "aurora-postgresql15"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Environment = "production"
  }
}

# Update instances to use compatible parameter groups
resource "aws_rds_cluster_instance" "aurora_instances" {
  count = 3

  identifier         = "aurora-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version

  db_parameter_group_name = aws_db_parameter_group.aurora_instance_pg15.name

  auto_minor_version_upgrade = true

  tags = {
    Environment = "production"
  }
}

resource "aws_db_parameter_group" "aurora_instance_pg15" {
  name   = "aurora-pg15-instance-params"
  family = "aurora-postgresql15"

  tags = {
    Environment = "production"
  }
}
```

## Blue-Green Deployment Strategy

For zero-downtime upgrades, use the RDS Blue-Green deployment feature:

```hcl
# The blue-green deployment is managed through AWS, but you can set up
# the infrastructure to support it

# Original (blue) database
resource "aws_db_instance" "blue" {
  identifier     = "app-db-blue"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.r6g.large"

  allocated_storage = 100
  username          = "dbadmin"
  password          = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  multi_az               = true

  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "blue-final"

  tags = {
    Environment = "production"
    Deployment  = "blue"
  }
}

# After creating a blue-green deployment via AWS and switching over,
# update your Terraform to reflect the new state
# Use terraform import to import the green environment
```

## Using Variables for Version Management

```hcl
# Centralized version management
variable "database_versions" {
  description = "Database engine versions for each environment"
  type = map(object({
    postgres_version = string
    aurora_version   = string
    redis_version    = string
  }))
  default = {
    production = {
      postgres_version = "15.4"
      aurora_version   = "15.4"
      redis_version    = "7.0"
    }
    staging = {
      postgres_version = "15.5"  # Test newer versions in staging first
      aurora_version   = "15.5"
      redis_version    = "7.0"
    }
    development = {
      postgres_version = "15.5"
      aurora_version   = "15.5"
      redis_version    = "7.0"
    }
  }
}
```

## Rollback Strategy

Always plan for rollback before starting an upgrade:

```hcl
# Pre-upgrade snapshot for rollback
resource "aws_db_snapshot" "rollback_snapshot" {
  db_instance_identifier = "production-db"
  db_snapshot_identifier = "rollback-snapshot-v14-to-v15"

  tags = {
    Purpose     = "rollback"
    FromVersion = "14.9"
    ToVersion   = "15.4"
    CreatedBy   = "terraform"
  }
}

# If rollback is needed, restore from the snapshot
# This would be a separate Terraform configuration or conditional resource
```

## Monitoring After Upgrade

Monitor your database closely after an upgrade to catch any issues:

```hcl
# Post-upgrade monitoring alarms
resource "aws_cloudwatch_metric_alarm" "post_upgrade_cpu" {
  alarm_name          = "post-upgrade-cpu-monitor"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 70

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.production.identifier
  }

  alarm_actions = [aws_sns_topic.upgrade_alerts.arn]
}

resource "aws_sns_topic" "upgrade_alerts" {
  name = "database-upgrade-alerts"
}
```

For tracking database performance before and after upgrades, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) provides comparison dashboards that help you identify performance regressions.

## Best Practices

Always test major version upgrades on a non-production copy first. Create a manual snapshot before any major upgrade for rollback purposes. Update parameter groups to be compatible with the new version before upgrading. Use `apply_immediately = false` for production to control when the upgrade happens. Monitor key metrics closely for 24 to 48 hours after an upgrade. Keep staging environments one minor version ahead of production to catch issues early. Document your upgrade process and maintain a runbook for each database engine.

## Conclusion

Database version upgrades are a necessary part of maintaining a healthy infrastructure. Terraform gives you a controlled, repeatable way to manage these upgrades across your database fleet. By testing in non-production environments, creating pre-upgrade snapshots, and monitoring post-upgrade metrics, you can minimize the risk and downtime associated with version changes. Make version management part of your regular infrastructure maintenance cadence.
