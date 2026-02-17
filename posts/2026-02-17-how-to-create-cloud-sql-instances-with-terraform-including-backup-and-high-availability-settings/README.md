# How to Create Cloud SQL Instances with Terraform Including Backup and High Availability Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Cloud SQL, Database, High Availability, Backups

Description: Learn how to create and manage Google Cloud SQL instances with Terraform, including automated backups, high availability configuration, and security best practices.

---

Databases are the one piece of infrastructure where getting the configuration wrong hurts the most. A misconfigured Cloud SQL instance can lead to data loss, downtime, or security breaches. Managing your database infrastructure with Terraform ensures that your configurations are reviewed, version-controlled, and reproducible.

This guide covers creating Cloud SQL instances with Terraform, with a focus on the settings that matter most for production: backups, high availability, security, and maintenance.

## Basic Cloud SQL Instance

Let us start with a PostgreSQL instance and build up from there:

```hcl
# sql.tf - Basic Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "main" {
  name             = "main-db"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    tier = "db-custom-2-8192"  # 2 vCPUs, 8GB RAM

    disk_type       = "PD_SSD"
    disk_size       = 50
    disk_autoresize = true
    disk_autoresize_limit = 500  # Max 500GB

    ip_configuration {
      ipv4_enabled = false  # Disable public IP
      private_network = google_compute_network.main.id
    }
  }

  # Prevent accidental deletion
  deletion_protection = true
}
```

A few important choices here:
- **Custom machine type**: The `db-custom-VCPU-RAM` format lets you pick exactly the CPU and memory you need.
- **SSD disk**: Always use PD_SSD for database workloads. The latency difference compared to PD_HDD is significant.
- **Disk autoresize**: Prevents the database from running out of space unexpectedly.
- **Private IP only**: Databases should not be accessible from the public internet.

## Configuring Automated Backups

Backups are non-negotiable for production databases. Here is a comprehensive backup configuration:

```hcl
# sql.tf - Cloud SQL with backup configuration
resource "google_sql_database_instance" "main" {
  name             = "main-db"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    tier = "db-custom-4-16384"  # 4 vCPUs, 16GB RAM

    disk_type       = "PD_SSD"
    disk_size       = 100
    disk_autoresize = true

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"  # UTC - schedule during low traffic
      location                       = "us"     # Multi-region backup storage
      point_in_time_recovery_enabled = true      # Enable PITR
      transaction_log_retention_days = 7         # Keep transaction logs for 7 days

      backup_retention_settings {
        retained_backups = 30  # Keep 30 days of backups
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }
  }

  deletion_protection = true
}
```

The key backup settings:

- **start_time**: Schedule backups during your lowest traffic period. The time is in UTC.
- **point_in_time_recovery_enabled**: This is critical. It lets you restore to any point in time, not just when the last backup ran. If bad data gets written at 2:30 PM and your last backup was at 3 AM, PITR saves you.
- **transaction_log_retention_days**: How many days of transaction logs to keep for PITR. 7 days is a good default.
- **retained_backups**: How many automated backups to keep. 30 gives you a month of daily backups.
- **location**: Use a multi-region location for backup storage to protect against regional outages.

## High Availability Configuration

High availability in Cloud SQL creates a standby instance in a different zone. If the primary fails, Cloud SQL automatically fails over to the standby:

```hcl
# sql_ha.tf - Cloud SQL with high availability
resource "google_sql_database_instance" "main" {
  name             = "main-db"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    tier = "db-custom-4-16384"

    # High availability - creates a standby in another zone
    availability_type = "REGIONAL"  # REGIONAL = HA, ZONAL = single zone

    disk_type       = "PD_SSD"
    disk_size       = 100
    disk_autoresize = true

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }
  }

  deletion_protection = true
}
```

The `availability_type = "REGIONAL"` setting is all it takes. Cloud SQL handles the standby instance, replication, and failover automatically. Keep in mind that HA doubles your cost since you are running two instances.

## Read Replicas

For read-heavy workloads, add read replicas to distribute the load:

```hcl
# sql_replica.tf - Read replica for the primary instance
resource "google_sql_database_instance" "read_replica" {
  name                 = "main-db-replica"
  master_instance_name = google_sql_database_instance.main.name
  database_version     = "POSTGRES_15"
  region               = var.region
  project              = var.project_id

  # Replicas inherit many settings from the primary
  replica_configuration {
    failover_target = false
  }

  settings {
    tier = "db-custom-2-8192"  # Can be smaller than primary

    disk_type       = "PD_SSD"
    disk_size       = 100
    disk_autoresize = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }
  }

  deletion_protection = true
}
```

## Database and User Management

Create databases and users through Terraform:

```hcl
# databases.tf - Database and user configuration
resource "google_sql_database" "app_db" {
  name     = "application"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

resource "google_sql_database" "analytics_db" {
  name     = "analytics"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

# Generate a random password for the database user
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Create the application database user
resource "google_sql_user" "app_user" {
  name     = "app-service"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
  project  = var.project_id
}

# Store the password in Secret Manager
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}
```

## Maintenance Window Configuration

Control when Cloud SQL applies maintenance updates:

```hcl
# Add maintenance window to the instance settings
settings {
  # ... other settings ...

  maintenance_window {
    day          = 7  # Sunday
    hour         = 4  # 4 AM UTC
    update_track = "stable"  # Use "canary" for early updates
  }
}
```

## Database Flags

Tune PostgreSQL settings through database flags:

```hcl
# Add database flags to the instance settings
settings {
  # ... other settings ...

  # PostgreSQL configuration flags
  database_flags {
    name  = "max_connections"
    value = "200"
  }

  database_flags {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
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
}
```

## Private Service Connection

For private IP connectivity, you need to set up a private service connection:

```hcl
# network.tf - Private service connection for Cloud SQL
resource "google_compute_network" "main" {
  name                    = "main-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

# Reserve an IP range for Cloud SQL private connectivity
resource "google_compute_global_address" "private_ip_range" {
  name          = "sql-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
  project       = var.project_id
}

# Create the private connection
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# The Cloud SQL instance depends on the private connection
resource "google_sql_database_instance" "main" {
  # ... configuration ...

  depends_on = [google_service_networking_connection.private_vpc_connection]
}
```

## Outputs

Export useful values for other Terraform configurations or applications:

```hcl
# outputs.tf
output "instance_name" {
  description = "The name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.name
}

output "connection_name" {
  description = "The connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.main.connection_name
}

output "private_ip" {
  description = "The private IP address of the instance"
  value       = google_sql_database_instance.main.private_ip_address
}

output "database_name" {
  description = "The application database name"
  value       = google_sql_database.app_db.name
}
```

## Best Practices

1. **Always enable deletion_protection.** Accidentally destroying a production database is a career-defining event you want to avoid.
2. **Use private IP only.** Never expose Cloud SQL to the public internet.
3. **Enable PITR.** Point-in-time recovery is your safety net for data corruption and accidental deletions.
4. **Use REGIONAL availability** for production databases. The cost of HA is worth the uptime.
5. **Store passwords in Secret Manager**, not in Terraform state or code.
6. **Enable disk autoresize** to prevent out-of-space failures.
7. **Set maintenance windows** during low-traffic periods.
8. **Log slow queries** using database flags to identify performance issues early.

## Wrapping Up

Cloud SQL with Terraform gives you a fully codified database setup that you can review, version, and replicate across environments. The combination of automated backups, point-in-time recovery, and high availability provides the resilience that production databases need. Start with these configurations as a baseline and tune the machine type, disk size, and database flags based on your workload characteristics.
