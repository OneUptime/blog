# How to Create GCP Cloud SQL MySQL Instances with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud SQL, MySQL, Database, Infrastructure as Code

Description: Step-by-step guide to creating GCP Cloud SQL MySQL instances with Terraform, covering instance tiers, networking, backups, high availability, flags, and user management.

---

Cloud SQL is Google Cloud's fully managed relational database service. It handles patching, backups, replication, and failover so you can focus on your application. While Cloud SQL supports MySQL, PostgreSQL, and SQL Server, this post focuses specifically on MySQL - covering the configuration options and patterns you need for production deployments.

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
  description = "Password for the MySQL root user"
  type        = string
  sensitive   = true
}
```

## Basic MySQL Instance

A simple Cloud SQL MySQL instance for development:

```hcl
# Basic Cloud SQL MySQL instance
resource "google_sql_database_instance" "mysql_basic" {
  name             = "mysql-basic-instance"
  database_version = "MYSQL_8_0"
  region           = var.region

  # Prevent accidental deletion
  deletion_protection = true

  settings {
    tier = "db-f1-micro"  # Smallest tier, good for dev/test

    # Disk configuration
    disk_size       = 10   # GB
    disk_type       = "PD_SSD"
    disk_autoresize = true
    disk_autoresize_limit = 50  # Max GB for auto-resize

    # IP configuration - public IP for development
    ip_configuration {
      ipv4_enabled = true

      authorized_networks {
        name  = "office"
        value = "203.0.113.0/24"
      }
    }
  }
}

# Create a database
resource "google_sql_database" "app_db" {
  name     = "app_database"
  instance = google_sql_database_instance.mysql_basic.name
  charset  = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

# Create a user
resource "google_sql_user" "app_user" {
  name     = "app_user"
  instance = google_sql_database_instance.mysql_basic.name
  password = var.db_password
  host     = "%"  # Allow connections from any host
}
```

The `db-f1-micro` tier is fine for development but should never be used in production. It has limited CPU and memory, and does not support high availability.

## Production MySQL Instance with Private IP

For production, you want private networking, high availability, and proper backup configuration:

```hcl
# VPC network for private Cloud SQL
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

# Private service access for Cloud SQL
resource "google_compute_global_address" "private_ip_range" {
  name          = "cloud-sql-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# Production MySQL instance with private networking
resource "google_sql_database_instance" "mysql_production" {
  name             = "mysql-production"
  database_version = "MYSQL_8_0"
  region           = var.region

  deletion_protection = true

  # Must wait for the VPC peering to be established
  depends_on = [google_service_networking_connection.private_vpc]

  settings {
    # Production-grade machine type
    # Options: db-n1-standard-1, db-n1-standard-2, db-n1-standard-4, etc.
    tier = "db-n1-standard-4"

    # Availability - REGIONAL for HA (automatic failover)
    availability_type = "REGIONAL"

    # Disk
    disk_size             = 100
    disk_type             = "PD_SSD"
    disk_autoresize       = true
    disk_autoresize_limit = 500

    # Private IP only - no public IP
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    # Backup configuration
    backup_configuration {
      enabled                        = true
      binary_log_enabled             = true  # Required for point-in-time recovery
      start_time                     = "03:00"  # 3 AM UTC
      location                       = "us"
      point_in_time_recovery_enabled = true

      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    # Maintenance window
    maintenance_window {
      day          = 7  # Sunday
      hour         = 4  # 4 AM UTC
      update_track = "stable"
    }

    # Deny maintenance during business hours
    deny_maintenance_period {
      start_date = "2026-12-20"
      end_date   = "2026-12-31"
      time       = "00:00:00"
    }

    # MySQL-specific flags
    database_flags {
      name  = "slow_query_log"
      value = "on"
    }

    database_flags {
      name  = "long_query_time"
      value = "2"  # Log queries taking more than 2 seconds
    }

    database_flags {
      name  = "innodb_buffer_pool_size"
      value = "8053063680"  # ~7.5GB for an 8GB instance
    }

    database_flags {
      name  = "max_connections"
      value = "500"
    }

    database_flags {
      name  = "innodb_log_file_size"
      value = "512000000"  # ~512MB
    }

    database_flags {
      name  = "character_set_server"
      value = "utf8mb4"
    }

    # Insights for query performance monitoring
    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    # User labels
    user_labels = {
      environment = "production"
      team        = "backend"
    }
  }
}
```

## High Availability Explained

Setting `availability_type = "REGIONAL"` creates a standby instance in a different zone within the same region. If the primary instance fails, Cloud SQL automatically fails over to the standby. A few things to know:

- Failover typically takes 60-120 seconds
- The standby is not readable - it only serves as a failover target
- You pay for both instances
- Binary logging must be enabled for HA to work properly

## Creating Read Replicas

Read replicas help distribute read traffic and reduce load on the primary:

```hcl
# Read replica in the same region
resource "google_sql_database_instance" "mysql_replica" {
  name                 = "mysql-production-replica-1"
  database_version     = "MYSQL_8_0"
  region               = var.region
  master_instance_name = google_sql_database_instance.mysql_production.name

  deletion_protection = true

  replica_configuration {
    failover_target = false  # Set to true to make this a failover replica
  }

  settings {
    tier = "db-n1-standard-2"  # Can be smaller than primary

    disk_size       = 100
    disk_type       = "PD_SSD"
    disk_autoresize = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    # Replicas do not need backup configuration
    # They inherit the primary's binary logs

    database_flags {
      name  = "max_connections"
      value = "500"
    }

    user_labels = {
      environment = "production"
      role        = "replica"
    }
  }
}

# Cross-region read replica for disaster recovery
resource "google_sql_database_instance" "mysql_dr_replica" {
  name                 = "mysql-production-dr-replica"
  database_version     = "MYSQL_8_0"
  region               = "europe-west1"  # Different region
  master_instance_name = google_sql_database_instance.mysql_production.name

  deletion_protection = true

  settings {
    tier = "db-n1-standard-2"

    disk_size       = 100
    disk_type       = "PD_SSD"
    disk_autoresize = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    user_labels = {
      environment = "production"
      role        = "dr-replica"
      region      = "europe-west1"
    }
  }
}
```

## Database and User Management

Create multiple databases and users with specific permissions:

```hcl
# Application databases
resource "google_sql_database" "databases" {
  for_each  = toset(["app_production", "app_analytics", "app_sessions"])
  name      = each.value
  instance  = google_sql_database_instance.mysql_production.name
  charset   = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

# Application user with standard access
resource "google_sql_user" "app" {
  name     = "app_service"
  instance = google_sql_database_instance.mysql_production.name
  password = var.db_password
  host     = "%"

  password_policy {
    complexity                  = "COMPLEXITY_DEFAULT"
    disallow_username_substring = true
  }
}

# Read-only user for analytics
resource "google_sql_user" "analytics" {
  name     = "analytics_reader"
  instance = google_sql_database_instance.mysql_production.name
  password = var.analytics_password
  host     = "%"
}

variable "analytics_password" {
  type      = string
  sensitive = true
}
```

Note that Terraform manages Cloud SQL users at the instance level, not the database level. You will need to grant specific database permissions using SQL statements after the users are created, either through a provisioner or your application's migration scripts.

## SSL/TLS Configuration

Enforce encrypted connections:

```hcl
# MySQL instance with SSL enforcement
resource "google_sql_database_instance" "mysql_ssl" {
  name             = "mysql-ssl-instance"
  database_version = "MYSQL_8_0"
  region           = var.region

  deletion_protection = true

  settings {
    tier = "db-n1-standard-2"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id

      # Require SSL for all connections
      require_ssl = true
    }

    # Force SSL mode
    database_flags {
      name  = "require_secure_transport"
      value = "on"
    }
  }
}

# Generate a client certificate
resource "google_sql_ssl_cert" "client_cert" {
  common_name = "app-client-cert"
  instance    = google_sql_database_instance.mysql_ssl.name
}
```

## Outputs

```hcl
output "mysql_connection_name" {
  description = "Connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.mysql_production.connection_name
}

output "mysql_private_ip" {
  description = "Private IP address of the MySQL instance"
  value       = google_sql_database_instance.mysql_production.private_ip_address
}

output "mysql_replica_ip" {
  description = "Private IP of the read replica"
  value       = google_sql_database_instance.mysql_replica.private_ip_address
}

output "client_cert" {
  description = "Client certificate for SSL connections"
  value       = google_sql_ssl_cert.client_cert.cert
  sensitive   = true
}
```

## Best Practices

**Always use private IP in production.** Public IPs with authorized networks are acceptable for development, but production databases should only be accessible within your VPC.

**Enable binary logging and point-in-time recovery.** This lets you restore to any point in time within your backup retention window - invaluable when someone accidentally runs a bad query.

**Size your `innodb_buffer_pool_size` correctly.** It should be about 70-80% of your instance's available memory. This is the single most impactful MySQL performance setting.

**Use `utf8mb4` instead of `utf8`.** MySQL's `utf8` is actually a 3-byte encoding that cannot store all Unicode characters (like emojis). `utf8mb4` is the real 4-byte UTF-8.

**Set `deletion_protection = true`.** This prevents Terraform from accidentally destroying your database instance. You have to explicitly set it to false before you can destroy the instance.

**Schedule maintenance windows during low-traffic periods.** Maintenance can cause brief downtime, so schedule it for when your application has the least traffic.

## Conclusion

Cloud SQL MySQL with Terraform gives you a reproducible, version-controlled database infrastructure. The key decisions are around machine tier (matching your workload), networking (private IP for production), high availability (REGIONAL for automatic failover), and backup configuration (point-in-time recovery). Getting these right from the start prevents painful migrations later.

For PostgreSQL deployments, check out our companion guide on [creating Cloud SQL PostgreSQL instances with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-sql-postgresql-instances-with-terraform/view).
