# How to Configure Cross-Region Replication with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cross-Region Replication, Disaster Recovery, AWS, Azure, GCP, Infrastructure as Code

Description: Learn how to configure cross-region data replication with OpenTofu across AWS, Azure, and GCP - covering RDS read replicas, DynamoDB global tables, Azure SQL geo-replication, and GCS multi-region...

## Introduction

Cross-region replication distributes data across geographic regions for disaster recovery, reduced read latency, and compliance with data sovereignty requirements. OpenTofu manages replication configuration for databases, object storage, and managed services - all with consistent IaC patterns.

## AWS RDS Cross-Region Read Replica

```hcl
# Primary RDS instance

resource "aws_db_instance" "primary" {
  identifier        = "${var.environment}-primary"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.t3.medium"
  allocated_storage = 100
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "Sun:04:00-Sun:05:00"
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.environment}-primary-final"

  tags = { Environment = var.environment, Role = "primary" }
}

# Cross-region read replica (using secondary provider)
resource "aws_db_instance" "replica" {
  provider = aws.eu_west_1  # Secondary region

  identifier          = "${var.environment}-replica"
  replicate_source_db = aws_db_instance.primary.arn  # ARN for cross-region
  instance_class      = "db.t3.medium"
  storage_encrypted   = true
  kms_key_id          = aws_kms_key.rds_replica.arn  # Key in replica region

  # Skip backups on replica - primary handles backups
  backup_retention_period = 0
  skip_final_snapshot     = true

  tags = { Environment = var.environment, Role = "replica" }
}
```

## DynamoDB Global Tables

```hcl
resource "aws_dynamodb_table" "global" {
  name             = "${var.environment}-sessions"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "session_id"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"  # Required for global tables

  attribute {
    name = "session_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Replicate to multiple regions
  replica {
    region_name = "eu-west-1"
    kms_key_arn = aws_kms_key.dynamodb_eu.arn
  }

  replica {
    region_name = "ap-southeast-1"
    kms_key_arn = aws_kms_key.dynamodb_ap.arn
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }

  tags = { Environment = var.environment }
}
```

## Azure SQL Geo-Replication

```hcl
# Primary Azure SQL Server
resource "azurerm_mssql_server" "primary" {
  name                = "${var.environment}-sql-primary"
  resource_group_name = azurerm_resource_group.primary.name
  location            = "East US"
  version             = "12.0"

  administrator_login          = var.sql_admin_username
  administrator_login_password = random_password.sql.result
}

resource "azurerm_mssql_database" "app" {
  name      = "${var.environment}-app-db"
  server_id = azurerm_mssql_server.primary.id
  sku_name  = "GP_Gen5_2"

  geo_backup_enabled = true
}

# Secondary Azure SQL Server (different region)
resource "azurerm_mssql_server" "secondary" {
  name                = "${var.environment}-sql-secondary"
  resource_group_name = azurerm_resource_group.secondary.name
  location            = "West Europe"
  version             = "12.0"

  administrator_login          = var.sql_admin_username
  administrator_login_password = random_password.sql.result
}

# Failover group for automatic failover
resource "azurerm_mssql_failover_group" "app" {
  name      = "${var.environment}-failover-group"
  server_id = azurerm_mssql_server.primary.id
  databases = [azurerm_mssql_database.app.id]

  partner_server {
    id = azurerm_mssql_server.secondary.id
  }

  read_write_endpoint_failover_policy {
    mode          = "Automatic"
    grace_minutes = 60  # Wait 60 minutes before auto-failover
  }
}
```

## GCS Multi-Region Bucket

```hcl
resource "google_storage_bucket" "multi_region" {
  name          = "${var.project_id}-data-global"
  location      = "US"  # Multi-region: US, EU, ASIA
  storage_class = "STANDARD"

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # Turbo replication for sub-15 minute recovery
  # (requires a dual-region bucket - see example below)
}

# Dual-region with Turbo Replication
resource "google_storage_bucket" "dual_region" {
  name          = "${var.project_id}-data-dual"
  location      = "NAM4"  # Predefined dual-region: Iowa + South Carolina
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  rpo = "ASYNC_TURBO"  # Turbo Replication for sub-15 minute RPO
}
```

## ElastiCache Global Datastore (Redis)

```hcl
resource "aws_elasticache_replication_group" "primary" {
  replication_group_id = "${var.environment}-redis-primary"
  description          = "Primary Redis cluster"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 2

  engine               = "redis"
  engine_version       = "7.0"
  automatic_failover_enabled = true
  multi_az_enabled           = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}

resource "aws_elasticache_global_replication_group" "redis" {
  global_replication_group_id_suffix = "${var.environment}-global"
  primary_replication_group_id       = aws_elasticache_replication_group.primary.id
}

resource "aws_elasticache_replication_group" "secondary" {
  provider = aws.eu_west_1

  replication_group_id        = "${var.environment}-redis-secondary"
  description                 = "Secondary Redis cluster (EU)"
  global_replication_group_id = aws_elasticache_global_replication_group.redis.global_replication_group_id
  node_type                   = "cache.r6g.large"
  num_cache_clusters          = 2
  automatic_failover_enabled  = true
}
```

## Conclusion

Cross-region replication with OpenTofu requires careful key management - each region needs its own KMS key for data encrypted at rest. For databases, start with read replicas (low cost) and promote to a primary only during actual DR events. DynamoDB Global Tables provide active-active multi-region replication for low-latency global reads. ElastiCache Global Datastore extends Redis replication across regions. Always test failover procedures in a non-production environment before relying on them in a real DR scenario.
