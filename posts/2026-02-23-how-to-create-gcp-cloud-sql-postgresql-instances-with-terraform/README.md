# How to Create GCP Cloud SQL PostgreSQL Instances with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud SQL, PostgreSQL, Database, Infrastructure as Code

Description: Comprehensive guide to creating GCP Cloud SQL PostgreSQL instances with Terraform, including extensions, connection pooling, performance tuning flags, backups, and high availability.

---

PostgreSQL on Cloud SQL is a popular choice for applications that need advanced SQL features, strong ACID compliance, and a rich extension ecosystem. Cloud SQL manages the operational burden - patching, backups, replication, failover - while giving you access to most PostgreSQL features and extensions.

This post covers creating Cloud SQL PostgreSQL instances with Terraform, with a focus on PostgreSQL-specific configuration that matters for production deployments.

## Provider Setup

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "db_password" {
  description = "Password for the PostgreSQL admin user"
  type        = string
  sensitive   = true
}
```

## Basic PostgreSQL Instance

A simple instance for development and testing:

```hcl
# Basic Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "postgres_basic" {
  name             = "postgres-basic"
  database_version = "POSTGRES_16"  # Latest supported version
  region           = var.region

  deletion_protection = false  # Set to true for production

  settings {
    tier = "db-f1-micro"

    disk_size       = 10
    disk_type       = "PD_SSD"
    disk_autoresize = true

    ip_configuration {
      ipv4_enabled = true

      authorized_networks {
        name  = "dev-office"
        value = "203.0.113.0/24"
      }
    }
  }
}

# Create a database
resource "google_sql_database" "app" {
  name     = "app_db"
  instance = google_sql_database_instance.postgres_basic.name
}

# Create an application user
resource "google_sql_user" "app" {
  name     = "app_user"
  instance = google_sql_database_instance.postgres_basic.name
  password = var.db_password
}
```

## Production PostgreSQL Instance

A fully configured production instance with private networking, HA, and tuned settings:

```hcl
# VPC and private service access
resource "google_compute_network" "main" {
  name                    = "main-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "main-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

resource "google_compute_global_address" "sql_private" {
  name          = "sql-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.sql_private.name]
}

# Production PostgreSQL instance
resource "google_sql_database_instance" "postgres_production" {
  name             = "postgres-production"
  database_version = "POSTGRES_16"
  region           = var.region

  deletion_protection = true

  depends_on = [google_service_networking_connection.private]

  settings {
    tier              = "db-custom-4-16384"  # 4 vCPUs, 16GB RAM
    availability_type = "REGIONAL"  # HA with automatic failover

    disk_size             = 100
    disk_type             = "PD_SSD"
    disk_autoresize       = true
    disk_autoresize_limit = 500

    # Private networking only
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      location                       = "us"
      point_in_time_recovery_enabled = true

      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    # Maintenance window - Sunday at 4 AM
    maintenance_window {
      day          = 7
      hour         = 4
      update_track = "stable"
    }

    # PostgreSQL performance tuning flags
    database_flags {
      name  = "shared_buffers"      # Main memory cache
      value = "4096000"             # ~4GB in 8KB pages (for 16GB instance)
    }

    database_flags {
      name  = "effective_cache_size"  # Estimate of OS cache available
      value = "12288000"              # ~12GB in 8KB pages
    }

    database_flags {
      name  = "work_mem"  # Memory per sort/hash operation
      value = "16384"     # 16MB - increase for complex queries
    }

    database_flags {
      name  = "maintenance_work_mem"  # Memory for VACUUM, CREATE INDEX
      value = "1048576"               # 1GB
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    database_flags {
      name  = "random_page_cost"  # Lower for SSD storage
      value = "1.1"
    }

    database_flags {
      name  = "effective_io_concurrency"  # Higher for SSD
      value = "200"
    }

    database_flags {
      name  = "log_min_duration_statement"  # Log slow queries
      value = "1000"                        # Queries over 1 second
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }

    database_flags {
      name  = "idle_in_transaction_session_timeout"
      value = "300000"  # 5 minutes - kill idle transactions
    }

    database_flags {
      name  = "statement_timeout"
      value = "60000"  # 60 seconds max query time
    }

    # Query insights
    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 4096
      record_application_tags = true
      record_client_address   = true
    }

    user_labels = {
      environment = "production"
      engine      = "postgresql"
    }
  }
}
```

## Custom Machine Types

Cloud SQL supports custom machine types using the `db-custom-{vCPUs}-{memoryMB}` format:

```hcl
# Examples of custom machine types:
# db-custom-1-3840   = 1 vCPU,  3.75 GB RAM
# db-custom-2-7680   = 2 vCPUs, 7.5 GB RAM
# db-custom-4-16384  = 4 vCPUs, 16 GB RAM
# db-custom-8-32768  = 8 vCPUs, 32 GB RAM
# db-custom-16-65536 = 16 vCPUs, 64 GB RAM

# You can also use the predefined tiers:
# db-f1-micro  = Shared core, 0.6 GB RAM (dev only)
# db-g1-small  = Shared core, 1.7 GB RAM (dev only)
# db-n1-standard-1 through db-n1-standard-96
# db-n1-highmem-2 through db-n1-highmem-96
```

## PostgreSQL Extensions

One of PostgreSQL's strengths is its extension system. Cloud SQL supports many popular extensions. You enable them at the database level:

```hcl
# Enable PostgreSQL extensions via database flags
resource "google_sql_database_instance" "postgres_extensions" {
  name             = "postgres-with-extensions"
  database_version = "POSTGRES_16"
  region           = var.region

  deletion_protection = true

  depends_on = [google_service_networking_connection.private]

  settings {
    tier = "db-custom-4-16384"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    # Enable the pg_stat_statements extension for query analysis
    database_flags {
      name  = "cloudsql.enable_pg_stat_statements"
      value = "on"
    }

    # Enable pgAudit for audit logging
    database_flags {
      name  = "cloudsql.enable_pgaudit"
      value = "on"
    }

    database_flags {
      name  = "pgaudit.log"
      value = "all"
    }

    # pg_cron for scheduled tasks (available on Cloud SQL)
    database_flags {
      name  = "cloudsql.enable_pg_cron"
      value = "on"
    }
  }
}
```

After the instance is created, you still need to run `CREATE EXTENSION` in your database for each extension you want to use. The database flags above just make the extensions available. Extensions like `uuid-ossp`, `postgis`, `pg_trgm`, and `hstore` can be enabled directly with SQL.

## Connection Pooling with Cloud SQL Proxy

Cloud SQL Proxy is the recommended way to connect. While not a Terraform resource itself, your application infrastructure should account for it:

```hcl
# Service account for Cloud SQL Proxy
resource "google_service_account" "sql_proxy" {
  account_id   = "cloud-sql-proxy"
  display_name = "Cloud SQL Proxy Service Account"
}

# Grant the Cloud SQL Client role
resource "google_project_iam_member" "sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sql_proxy.email}"
}

# If running on GKE, you might create a Kubernetes service account binding
# This example shows the IAM binding for Workload Identity
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.sql_proxy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/sql-proxy-sa]"
}
```

For applications that need connection pooling beyond what Cloud SQL Proxy provides, consider using PgBouncer as a sidecar or separate deployment.

## Multiple Databases and Users

```hcl
# Multiple databases
variable "databases" {
  type = list(string)
  default = [
    "app_production",
    "app_analytics",
    "app_sessions",
  ]
}

resource "google_sql_database" "databases" {
  for_each = toset(var.databases)
  name     = each.value
  instance = google_sql_database_instance.postgres_production.name
}

# Application user
resource "google_sql_user" "app_user" {
  name     = "app_service"
  instance = google_sql_database_instance.postgres_production.name
  password = var.db_password
}

# Read-only user for reporting
resource "google_sql_user" "readonly" {
  name     = "readonly_user"
  instance = google_sql_database_instance.postgres_production.name
  password = var.readonly_password
}

# Migration user with elevated privileges
resource "google_sql_user" "migration" {
  name     = "migration_user"
  instance = google_sql_database_instance.postgres_production.name
  password = var.migration_password
}

variable "readonly_password" {
  type      = string
  sensitive = true
}

variable "migration_password" {
  type      = string
  sensitive = true
}
```

## PostgreSQL-Specific Tuning Tips

The database flags above deserve some explanation:

**shared_buffers** - This is PostgreSQL's main shared memory cache. Set it to about 25% of total instance memory. For a 16GB instance, that is 4GB.

**effective_cache_size** - Not an allocation, just a hint to the query planner about how much memory is available for caching (including OS cache). Set to about 75% of total memory.

**work_mem** - Memory per sort or hash operation. Be careful - each query can use multiple sort operations, and each connection can run queries. A value too high multiplied by max_connections can exhaust memory.

**random_page_cost** - The default (4.0) assumes spinning disks. Cloud SQL uses SSDs, so set this to 1.1 to help the planner choose index scans more often.

**idle_in_transaction_session_timeout** - Kills connections that sit idle inside a transaction. This prevents long-running transactions from holding locks and bloating the table due to MVCC.

## Outputs

```hcl
output "postgres_connection_name" {
  description = "Connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.postgres_production.connection_name
}

output "postgres_private_ip" {
  description = "Private IP of the PostgreSQL instance"
  value       = google_sql_database_instance.postgres_production.private_ip_address
}

output "postgres_version" {
  description = "PostgreSQL version"
  value       = google_sql_database_instance.postgres_production.database_version
}

output "sql_proxy_service_account" {
  description = "Service account email for Cloud SQL Proxy"
  value       = google_service_account.sql_proxy.email
}
```

## Best Practices

**Use PostgreSQL 16 for new projects.** It offers better performance, improved logical replication, and enhanced security features compared to older versions.

**Tune `shared_buffers` and `effective_cache_size` based on your tier.** The defaults are conservative and designed for small instances. Production instances benefit significantly from tuning these.

**Enable `pg_stat_statements`.** It is the single most useful extension for identifying slow queries and understanding your query workload. Enable it from day one.

**Set `idle_in_transaction_session_timeout`.** Idle transactions are a common source of database problems in PostgreSQL. They hold locks and prevent VACUUM from cleaning up dead rows.

**Use the Cloud SQL Proxy for connections.** It handles SSL, IAM authentication, and connection management. Avoid exposing Cloud SQL with public IPs in production.

**Plan for connection limits.** PostgreSQL's connection handling is process-based, so each connection uses significant memory. With `db-custom-4-16384`, keeping max_connections at 200 is reasonable. Use connection pooling (PgBouncer or application-level) if you need more concurrent connections.

## Conclusion

Cloud SQL PostgreSQL with Terraform gives you a production-ready database with minimal operational overhead. The key areas to focus on are proper instance sizing, PostgreSQL-specific performance flags, private networking, and backup configuration. PostgreSQL's extension ecosystem and advanced SQL features make it an excellent choice for applications that need more than basic CRUD operations.

For MySQL-specific deployments, see our companion guide on [creating Cloud SQL MySQL instances with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-sql-mysql-instances-with-terraform/view).
