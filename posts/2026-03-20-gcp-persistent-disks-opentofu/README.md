# How to Set Up GCP Persistent Disks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Persistent Disk, Storage, OpenTofu, Compute Engine, Infrastructure

Description: Learn how to create and manage GCP Persistent Disks with OpenTofu including disk types, regional disks, and attaching them to Compute Engine instances.

## Overview

GCP Persistent Disks provide durable block storage for Compute Engine instances. They come in four types: Standard (HDD), Balanced (SSD), SSD, and Extreme SSD. OpenTofu manages disk creation, resizing, and attachment.

## Step 1: Create Different Disk Types

```hcl
# main.tf - Various persistent disk types

# pd-standard: HDD, cheapest, good for sequential read/write
resource "google_compute_disk" "standard_disk" {
  name  = "app-standard-disk"
  type  = "pd-standard"
  zone  = "us-central1-a"
  size  = 500  # GB
  labels = {
    purpose = "archive-storage"
  }
}

# pd-balanced: SSD, good price/performance balance
resource "google_compute_disk" "balanced_disk" {
  name  = "app-balanced-disk"
  type  = "pd-balanced"
  zone  = "us-central1-a"
  size  = 100
}

# pd-ssd: High-performance SSD for databases
resource "google_compute_disk" "ssd_disk" {
  name  = "db-ssd-disk"
  type  = "pd-ssd"
  zone  = "us-central1-a"
  size  = 200
}

# pd-extreme: Highest IOPS for performance-critical workloads
resource "google_compute_disk" "extreme_disk" {
  name              = "high-perf-disk"
  type              = "pd-extreme"
  zone              = "us-central1-a"
  size              = 500
  provisioned_iops  = 100000  # Custom IOPS provisioning for Extreme disks
}
```

## Step 2: Regional Persistent Disk (Multi-Zone Replication)

```hcl
# Regional disk replicates data across two zones for HA
resource "google_compute_region_disk" "regional_data_disk" {
  name          = "regional-data-disk"
  type          = "pd-ssd"
  region        = "us-central1"
  size          = 200

  # Specify two replica zones
  replica_zones = [
    "us-central1-a",
    "us-central1-b",
  ]
}
```

## Step 3: Attach Disks to a VM

```hcl
# Attach multiple disks to a VM
resource "google_compute_instance" "db_vm" {
  name         = "database-vm"
  machine_type = "n2-standard-8"
  zone         = "us-central1-a"

  # Boot disk
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      type  = "pd-ssd"
      size  = 50
    }
  }

  # Attach the SSD data disk for database files
  attached_disk {
    source      = google_compute_disk.ssd_disk.self_link
    device_name = "data-disk"
    mode        = "READ_WRITE"
  }

  # Attach standard disk for backups (read-write)
  attached_disk {
    source      = google_compute_disk.standard_disk.self_link
    device_name = "backup-disk"
    mode        = "READ_WRITE"
  }

  network_interface {
    network = "default"
  }
}
```

## Step 4: Disk from Snapshot

```hcl
# Create a disk from an existing snapshot
resource "google_compute_disk" "restored_disk" {
  name     = "restored-from-snapshot"
  type     = "pd-ssd"
  zone     = "us-central1-a"
  size     = 200
  # Restore disk data from a snapshot
  snapshot = "global/snapshots/daily-snapshot"
}
```

## Summary

GCP Persistent Disks with OpenTofu provide durable, high-performance block storage for Compute Engine. Use `pd-balanced` for most workloads, `pd-ssd` for databases, and regional disks for applications requiring disk-level HA. Always separate boot disks from data disks to simplify snapshots and disk management.
