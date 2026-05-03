# How to Set Up Database Replication for DR with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, Replication, Disaster Recovery, OpenTofu, RDS, Aurora, Cloud SQL

Description: Learn how to configure database replication for disaster recovery across AWS RDS, Azure SQL, and GCP Cloud SQL using OpenTofu for minimal RPO.

## Overview

Database replication for DR creates continuously synchronized copies of data in separate geographic locations. OpenTofu configures cross-region read replicas, failover groups, and global database configurations across cloud providers.

## Step 1: AWS RDS Cross-Region Replication

```hcl
# main.tf - RDS cross-region replica for DR

resource "aws_db_instance" "primary" {
  identifier              = "app-primary"
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = "db.r6g.xlarge"
  allocated_storage       = 500
  max_allocated_storage   = 2000  # Auto-scaling storage
  storage_encrypted       = true
  backup_retention_period = 35  # Maximum for cross-region replica support
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "app-primary-final-snapshot"

  performance_insights_enabled = true
  monitoring_interval          = 60
}

# Cross-region replica (async replication, typically < 5 seconds lag)
resource "aws_db_instance" "replica_us_west" {
  provider            = aws.dr
  identifier          = "app-replica-us-west"
  replicate_source_db = aws_db_instance.primary.arn
  instance_class      = "db.r6g.large"
  kms_key_id          = aws_kms_key.dr_rds.arn
  storage_encrypted   = true

  deletion_protection = true
  skip_final_snapshot = true  # Read replicas never take final snapshots
}
```

## Step 2: Aurora Global Database (< 1s Replication)

```hcl
# Aurora Global Cluster for sub-second replication
resource "aws_rds_global_cluster" "main" {
  global_cluster_identifier = "app-global"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  storage_encrypted         = true
}

resource "aws_rds_cluster" "primary" {
  provider                  = aws.primary
  cluster_identifier        = "app-primary"
  engine                    = "aurora-postgresql"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  master_username           = "dbadmin"
  manage_master_user_password = true
  storage_encrypted         = true

  backup_retention_period = 7
  deletion_protection     = true
}

# Secondary cluster in DR region
resource "aws_rds_cluster" "secondary" {
  provider                  = aws.dr
  cluster_identifier        = "app-secondary"
  engine                    = "aurora-postgresql"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  storage_encrypted         = true
  kms_key_id                = aws_kms_key.dr.arn
}
```

## Step 3: GCP Cloud SQL Point-in-Time Recovery

```hcl
# Cloud SQL with cross-region replica
resource "google_sql_database_instance" "primary" {
  name             = "app-primary"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-n1-standard-4"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      location                       = "us"
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 30
      }
    }

    availability_type = "REGIONAL"
  }
}

resource "google_sql_database_instance" "cross_region_replica" {
  name                 = "app-cross-region-replica"
  database_version     = "POSTGRES_15"
  region               = "europe-west1"
  master_instance_name = google_sql_database_instance.primary.name
  deletion_protection  = true

  settings {
    tier = "db-n1-standard-2"
  }
}
```

## Step 4: Azure SQL Geo-Replication with Automatic Failover

```hcl
# Azure SQL with automatic failover group
resource "azurerm_mssql_server" "primary" {
  name                = "app-sql-primary"
  resource_group_name = azurerm_resource_group.primary.name
  location            = "East US"
  version             = "12.0"
  administrator_login = "sqladmin"
  administrator_login_password = var.sql_admin_password
  public_network_access_enabled = false
}

resource "azurerm_mssql_failover_group" "geo_replica" {
  name      = "app-geo-failover"
  server_id = azurerm_mssql_server.primary.id
  databases = [azurerm_mssql_database.app.id]

  partner_server {
    id = azurerm_mssql_server.secondary.id
  }

  read_write_endpoint_failover_policy {
    mode          = "Automatic"
    grace_minutes = 60  # Azure requires a minimum of 60 minutes
  }
}
```

## Summary

Database replication for DR configured with OpenTofu provides options across a spectrum of cost and RPO. RDS cross-region read replicas achieve typically under 5 second lag with asynchronous replication. Aurora Global Database provides typically under 1 second cross-region replication lag with the ability to fail over with RPO measured in seconds. Azure SQL Failover Groups with automatic policy handle failover decisions programmatically based on configurable grace periods.
