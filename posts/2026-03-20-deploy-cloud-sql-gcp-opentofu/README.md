# How to Deploy Cloud SQL on GCP with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Cloud SQL, Database, Infrastructure as Code, Google Cloud

Description: Learn how to provision a Google Cloud SQL instance with private networking, backups, and read replicas using OpenTofu.

---

Google Cloud SQL is a fully managed database service supporting PostgreSQL, MySQL, and SQL Server. OpenTofu's `google` provider lets you declare Cloud SQL instances with private IP, high availability, and maintenance windows as code.

---

## Create a Cloud SQL Instance

```hcl
resource "google_sql_database_instance" "main" {
  name             = "main-db"
  region           = "us-central1"
  database_version = "POSTGRES_15"

  settings {
    tier = "db-custom-2-7680"  # 2 vCPU, 7.5 GB RAM

    availability_type = "REGIONAL"  # High availability
    disk_autoresize   = true
    disk_size         = 50
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    maintenance_window {
      day          = 1  # Monday
      hour         = 4
      update_track = "stable"
    }

    ip_configuration {
      ipv4_enabled    = false  # No public IP
      private_network = google_compute_network.main.id
    }
  }

  deletion_protection = true
}
```

---

## Create the Database and User

```hcl
resource "google_sql_database" "app" {
  name     = "appdb"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = "appuser"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}
```

---

## Create a Read Replica

```hcl
resource "google_sql_database_instance" "replica" {
  name                 = "main-db-replica"
  region               = "us-east1"
  database_version     = "POSTGRES_15"
  master_instance_name = google_sql_database_instance.main.name

  settings {
    tier              = "db-custom-1-3840"
    availability_type = "ZONAL"
    disk_autoresize   = true
  }
}
```

---

## Output the Connection Name

```hcl
output "connection_name" {
  value = google_sql_database_instance.main.connection_name
  # Format: project:region:instance-name
}

output "private_ip" {
  value = google_sql_database_instance.main.private_ip_address
}
```

---

## Summary

Use `google_sql_database_instance` with `settings.availability_type = "REGIONAL"` for high availability, `settings.ip_configuration.ipv4_enabled = false` to disable public access, and `settings.backup_configuration.enabled = true` for automated backups. Create read replicas by setting `master_instance_name`. Use the `connection_name` with the Cloud SQL Auth Proxy for secure connections.
