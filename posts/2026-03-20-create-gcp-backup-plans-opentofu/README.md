# How to Create GCP Backup Plans with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Backup, Disaster Recovery, Infrastructure as Code

Description: Learn how to create GCP Backup and DR backup plans with OpenTofu for automated, policy-driven protection of GCP Compute, disks, and databases.

GCP Backup and DR provides centralized backup management for GCP resources. Managing backup plans and policies in OpenTofu ensures consistent protection settings are applied automatically as resources are provisioned.

## Provider Configuration

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
  region  = "us-central1"
}
```

## GCE Disk Snapshots (Snapshot Schedule Policy)

```hcl
resource "google_compute_resource_policy" "daily_snapshot" {
  name   = "daily-snapshot-policy"
  region = "us-central1"

  snapshot_schedule_policy {
    schedule {
      daily_schedule {
        days_in_cycle = 1
        start_time    = "03:00"  # UTC
      }
    }

    retention_policy {
      max_retention_days    = 30
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }

    snapshot_properties {
      labels = {
        backup_policy = "daily"
        environment   = "production"
      }

      storage_locations = ["us"]  # Multi-region storage
      guest_flush       = true    # Application-consistent (requires agent)
    }
  }
}

# Attach to a disk

resource "google_compute_disk_resource_policy_attachment" "app_disk" {
  name = google_compute_resource_policy.daily_snapshot.name
  disk = google_compute_disk.app.name
  zone = "us-central1-a"
}
```

## Weekly Snapshot with Long Retention

```hcl
resource "google_compute_resource_policy" "weekly_snapshot" {
  name   = "weekly-snapshot-policy"
  region = "us-central1"

  snapshot_schedule_policy {
    schedule {
      weekly_schedule {
        day_of_weeks {
          day        = "SATURDAY"
          start_time = "02:00"
        }
      }
    }

    retention_policy {
      max_retention_days    = 365
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }

    snapshot_properties {
      labels = {
        backup_policy = "weekly"
      }
    }
  }
}
```

## Cloud SQL Automated Backups

```hcl
resource "google_sql_database_instance" "main" {
  name             = "production-db"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-custom-2-8192"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true

      # Transaction log retention for point-in-time recovery
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 30  # Keep 30 automated backups
        retention_unit   = "COUNT"
      }
    }
  }
}
```

## GKE Backup Plans

```hcl
# Enable GKE Backup API
resource "google_project_service" "backup_for_gke" {
  project = var.project_id
  service = "gkebackup.googleapis.com"
}

resource "google_gke_backup_backup_plan" "main" {
  name     = "production-gke-backup"
  cluster  = google_container_cluster.main.id
  location = "us-central1"

  retention_policy {
    backup_delete_lock_days = 7   # Lock backups for 7 days
    backup_retain_days      = 30  # Keep backups for 30 days
  }

  backup_schedule {
    cron_schedule = "0 3 * * *"  # Daily at 3 AM UTC
  }

  backup_config {
    include_volume_data = true
    include_secrets     = true

    # Backup specific namespaces
    selected_namespaces {
      namespaces = ["production", "monitoring"]
    }
  }
}
```

## Conclusion

GCP backup plans in OpenTofu provide automated, policy-driven protection for Compute disks, Cloud SQL, and GKE clusters. Use resource policies for disk snapshot scheduling, enable automated backups and PITR for Cloud SQL, and use GKE Backup for Kubernetes workload protection. Set appropriate retention periods based on your RPO requirements and keep snapshots in multi-region storage for DR resilience.
