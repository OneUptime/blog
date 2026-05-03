# How to Deploy Cloud SQL on GCP with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloud SQL, GCP, Database, PostgreSQL, MySQL, Infrastructure as Code

Description: Learn how to deploy Cloud SQL on Google Cloud Platform using OpenTofu - including instance configuration, private IP, read replicas, and high availability setup.

## Introduction

GCP Cloud SQL supports PostgreSQL, MySQL, and SQL Server. OpenTofu manages Cloud SQL instances with `google_sql_database_instance` for the instance, `google_sql_database` for databases, and `google_sql_user` for users. Private IP configuration requires a VPC peering setup with the servicenetworking API.

## Private IP Setup (VPC Peering)

```hcl
# Enable Service Networking API

resource "google_project_service" "servicenetworking" {
  service            = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

# Reserve IP range for Cloud SQL private IP
resource "google_compute_global_address" "private_ip_range" {
  name          = "${var.environment}-cloudsql-private-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

# Create VPC peering connection
resource "google_service_networking_connection" "private_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]

  depends_on = [google_project_service.servicenetworking]
}
```

## Cloud SQL Instance

```hcl
resource "google_sql_database_instance" "main" {
  name             = "${var.environment}-postgres-${random_id.suffix.hex}"
  region           = var.gcp_region
  database_version = "POSTGRES_15"

  settings {
    tier = var.db_tier  # "db-custom-2-4096" = 2 vCPU, 4 GB RAM

    # Private IP only
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    # Backups
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      location                       = var.gcp_region
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    # Maintenance
    maintenance_window {
      day          = 7  # Sunday
      hour         = 4
      update_track = "stable"
    }

    # High availability
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"

    # Disk
    disk_size       = 100
    disk_type       = "PD_SSD"
    disk_autoresize = true
    disk_autoresize_limit = 500

    # Insights
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }

    # Labels
    user_labels = {
      environment = var.environment
      managed-by  = "opentofu"
    }
  }

  deletion_protection = var.environment == "prod"

  depends_on = [google_service_networking_connection.private_connection]
}

resource "random_id" "suffix" {
  byte_length = 4
}
```

## Database and User

```hcl
resource "google_sql_database" "main" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = var.db_username
  instance = google_sql_database_instance.main.name
  password = var.db_password

  # Use IAM authentication instead of password (recommended)
  # deletion_policy = "ABANDON"  # Required for IAM users
}
```

## IAM Database Authentication (Recommended)

```hcl
# Service account for IAM database auth
resource "google_service_account" "db_client" {
  account_id   = "${var.environment}-db-client"
  display_name = "Cloud SQL Client Service Account"
}

# Grant Cloud SQL Client role
resource "google_project_iam_member" "db_client" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.db_client.email}"
}

# IAM user in Cloud SQL
resource "google_sql_user" "iam_user" {
  # For Postgres, GCP requires omitting the ".gserviceaccount.com" suffix
  # from the service account email due to database username length limits.
  name     = trimsuffix(google_service_account.db_client.email, ".gserviceaccount.com")
  instance = google_sql_database_instance.main.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}
```

## Read Replica

```hcl
resource "google_sql_database_instance" "read_replica" {
  count = var.environment == "prod" ? 1 : 0

  name                 = "${var.environment}-postgres-replica-${random_id.suffix.hex}"
  region               = var.replica_region  # Can be different region
  database_version     = google_sql_database_instance.main.database_version
  master_instance_name = google_sql_database_instance.main.name

  settings {
    tier = var.replica_tier

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    availability_type = "ZONAL"  # Replicas don't need HA
  }

  deletion_protection = false
}
```

## Outputs

```hcl
output "instance_connection_name" {
  value       = google_sql_database_instance.main.connection_name
  description = "For Cloud SQL Auth Proxy: project:region:instance"
}

output "private_ip" {
  value = google_sql_database_instance.main.private_ip_address
}

output "database_name" {
  value = google_sql_database.main.name
}
```

## Conclusion

Cloud SQL on GCP requires VPC peering setup before creating instances with private IPs - configure the private IP range and service networking connection first. Use `availability_type = "REGIONAL"` for production HA. Enable Query Insights for performance monitoring. For application authentication, prefer IAM database authentication over password-based users - it integrates with GCP's identity platform and avoids password rotation complexity.
