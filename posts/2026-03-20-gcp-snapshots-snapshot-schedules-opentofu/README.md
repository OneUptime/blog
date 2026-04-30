# How to Create GCP Snapshots and Snapshot Schedules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Snapshot, Backup, OpenTofu, Compute Engine, Data Protection

Description: Learn how to create GCP persistent disk snapshots and automated snapshot schedules with OpenTofu for reliable backup and disaster recovery.

## Overview

GCP Persistent Disk snapshots are incremental backups stored in Cloud Storage. Snapshot schedules automate the backup process with retention policies. OpenTofu manages both one-time snapshots and recurring snapshot schedules.

## Step 1: Create a Manual Snapshot

```hcl
# main.tf - Create a snapshot of a persistent disk

resource "google_compute_snapshot" "manual_snapshot" {
  name        = "app-disk-snapshot-initial"
  source_disk = google_compute_disk.app_disk.name
  zone        = "us-central1-a"

  # Optional: snapshot description
  description = "Initial snapshot before major application update"

  # Override the project's default snapshot storage location
  storage_locations = ["us-central1"]

  labels = {
    environment = "production"
    created-by  = "opentofu"
  }
}
```

## Step 2: Create a Snapshot Schedule

```hcl
# Resource policy for automated disk snapshots
resource "google_compute_resource_policy" "daily_snapshot" {
  name   = "daily-snapshot-policy"
  region = "us-central1"

  snapshot_schedule_policy {
    schedule {
      # Take a snapshot every day at 4 AM UTC
      daily_schedule {
        days_in_cycle = 1
        start_time    = "04:00"
      }
    }

    # Retention policy - keep snapshots for 14 days
    retention_policy {
      max_retention_days    = 14
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }

    # Optional: customize snapshot labels and storage location
    snapshot_properties {
      labels = {
        snapshot_type = "automated"
        environment   = "production"
      }
      storage_locations = ["us-central1"]
      guest_flush       = false  # Set to true after configuring the guest environment
    }
  }
}
```

## Step 3: Attach Snapshot Schedule to a Disk

```hcl
# Attach the snapshot schedule to a disk
resource "google_compute_disk_resource_policy_attachment" "snapshot_attachment" {
  name = google_compute_resource_policy.daily_snapshot.name
  disk = google_compute_disk.app_disk.name
  zone = "us-central1-a"
}
```

## Step 4: Hourly Snapshot Schedule for Critical Databases

```hcl
# More frequent snapshots for critical databases
resource "google_compute_resource_policy" "hourly_snapshot" {
  name   = "hourly-snapshot-policy"
  region = "us-central1"

  snapshot_schedule_policy {
    schedule {
      # Snapshot every hour
      hourly_schedule {
        hours_in_cycle = 1
        start_time     = "00:00"
      }
    }

    retention_policy {
      max_retention_days    = 3  # Retain hourly snapshots for up to 3 days
      on_source_disk_delete = "APPLY_RETENTION_POLICY"
    }
  }
}

# Attach hourly policy to the database disk
resource "google_compute_disk_resource_policy_attachment" "db_snapshot" {
  name = google_compute_resource_policy.hourly_snapshot.name
  disk = google_compute_disk.ssd_disk.name
  zone = "us-central1-a"
}
```

## Step 5: Create Disk from Snapshot (Restore)

```hcl
# Restore a disk from snapshot for DR testing
resource "google_compute_disk" "restored_disk" {
  name     = "restored-db-disk"
  type     = "pd-ssd"
  zone     = "us-central1-c"
  size     = google_compute_disk.app_disk.size
  snapshot = google_compute_snapshot.manual_snapshot.self_link
}
```

## Summary

GCP snapshot schedules with OpenTofu automate backup workflows without manual intervention. Daily schedules with 14-day retention are suitable for most workloads, while hourly snapshots with shorter retention protect critical databases. Use `guest_flush = true` only after configuring the guest environment for application-consistent backups.
