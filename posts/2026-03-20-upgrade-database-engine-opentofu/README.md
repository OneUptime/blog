# How to Upgrade Database Engine Versions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Database Upgrade, PostgreSQL, Infrastructure as Code

Description: Learn how to safely upgrade RDS and Aurora database engine versions using OpenTofu with proper snapshot backups and minimal downtime strategies.

## Introduction

Database engine upgrades introduce risk if not handled carefully. OpenTofu tracks engine version changes in state and applies them during planned maintenance windows. This guide covers safe upgrade procedures with pre-upgrade snapshots and validation.

## Pre-Upgrade Snapshot

Always take a manual snapshot before upgrading.

```hcl
resource "aws_db_snapshot" "pre_upgrade" {
  db_instance_identifier = aws_db_instance.main.id
  db_snapshot_identifier = "${var.app_name}-pre-upgrade-${formatdate("YYYYMMDD", timestamp())}"

  tags = {
    Purpose   = "pre-engine-upgrade"
    ManagedBy = "opentofu"
  }
}
```

## Minor Version Upgrade

Minor upgrades can be applied automatically or during the next maintenance window.

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.app_name}-db-${var.environment}"
  engine         = "postgres"
  engine_version = var.db_engine_version  # change from "15.4" to "15.6"
  instance_class = "db.t3.medium"

  username = var.db_username
  password = var.db_password

  # Allow automatic minor version upgrades
  auto_minor_version_upgrade  = true
  maintenance_window          = "Mon:03:00-Mon:04:00"
  apply_immediately           = false  # apply during maintenance window

  backup_retention_period = 7
  skip_final_snapshot     = false

  final_snapshot_identifier = "${var.app_name}-db-final"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Major Version Upgrade

Major upgrades (e.g., PostgreSQL 14 to 16) require more planning.

```hcl
# Step 1: Set apply_immediately = false to schedule upgrade

# Step 2: Take manual snapshot
# Step 3: Update engine_version variable
# Step 4: Run tofu plan to review changes
# Step 5: Apply during low-traffic window

resource "aws_db_instance" "main" {
  identifier     = "${var.app_name}-db-${var.environment}"
  engine         = "postgres"
  engine_version = var.db_engine_version  # "15.6" -> "16.2" for major upgrade

  # For major upgrades, allow the version bump and point to a parameter group for the new family
  allow_major_version_upgrade = true
  apply_immediately           = var.apply_immediately  # true only during upgrade window

  parameter_group_name = aws_db_parameter_group.postgres16.name  # update PG for new major version
}

# New parameter group for PostgreSQL 16
resource "aws_db_parameter_group" "postgres16" {
  name   = "${var.app_name}-postgres16"
  family = "postgres16"

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # log queries > 1 second
  }
}
```

## Aurora Cluster Upgrade

```hcl
resource "aws_rds_cluster" "main" {
  cluster_identifier = "${var.app_name}-aurora"
  engine             = "aurora-postgresql"
  engine_version     = var.aurora_engine_version  # "15.4" -> "16.1"

  master_username = var.db_username
  master_password = var.db_password

  # Minor version patches can use Aurora's Zero-Downtime Patching (ZDP); major version upgrades run pg_upgrade in place and incur downtime (use Blue/Green Deployments to minimize it)
  apply_immediately = false
  allow_major_version_upgrade = true

  backup_retention_period = 7
  preferred_backup_window = "02:00-03:00"
}
```

## Upgrade Validation Script

```bash
#!/bin/bash
# scripts/validate-db-upgrade.sh
DB_ENDPOINT="$1"
DB_USER="$2"
DB_NAME="$3"

echo "Validating database after upgrade..."

# Check PostgreSQL version
psql "postgresql://${DB_USER}@${DB_ENDPOINT}/${DB_NAME}" \
  -c "SELECT version();"

# Run basic health checks
psql "postgresql://${DB_USER}@${DB_ENDPOINT}/${DB_NAME}" \
  -c "SELECT count(*) FROM users;"

echo "Validation complete."
```

## Deploying

```bash
# 1. Take snapshot
tofu apply -target=aws_db_snapshot.pre_upgrade

# 2. Review upgrade plan
tofu plan -var="db_engine_version=16.2" -var="apply_immediately=true"

# 3. Apply during maintenance window
tofu apply -var="db_engine_version=16.2" -var="apply_immediately=true"
```

## Summary

Database engine upgrades require careful planning, pre-upgrade snapshots, and validated parameter groups for new major versions. OpenTofu tracks engine version in state and applies upgrades predictably - making database upgrades a safe, auditable infrastructure change.
