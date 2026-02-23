# How to Create GCP Filestore Instances with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Filestore, NFS, Storage, Infrastructure as Code

Description: Learn how to provision Google Cloud Filestore NFS instances using Terraform for shared file storage across Compute Engine and GKE workloads.

---

Not everything fits neatly into object storage. Some applications need a traditional file system - NFS shares that multiple servers can mount simultaneously. Machine learning training jobs that read datasets from a shared directory, content management systems that store uploads on a shared volume, legacy applications that expect a POSIX file system. Google Cloud Filestore provides managed NFS storage for these use cases.

Terraform lets you define Filestore instances as code, so you can provision shared storage consistently across environments. This guide covers creating Filestore instances at different tiers, configuring access controls, and connecting them to GKE and Compute Engine.

## Enabling the API

```hcl
# Enable Filestore API
resource "google_project_service" "filestore" {
  project = var.project_id
  service = "file.googleapis.com"

  disable_on_destroy = false
}
```

## Basic Filestore Instance

The simplest Filestore instance uses the Basic HDD tier, which is good for development and workloads that are not performance-sensitive.

```hcl
# Basic HDD Filestore instance
resource "google_filestore_instance" "basic" {
  name     = "shared-storage-${var.environment}"
  project  = var.project_id
  location = var.zone
  tier     = "BASIC_HDD"

  file_shares {
    name       = "data"
    capacity_gb = 1024  # Minimum is 1 TB for Basic HDD

    # NFS export options
    nfs_export_options {
      ip_ranges   = [var.vpc_cidr]
      access_mode = "READ_WRITE"
      squash_mode = "NO_ROOT_SQUASH"
    }
  }

  networks {
    network           = var.network_name
    modes             = ["MODE_IPV4"]
    reserved_ip_range = "10.0.10.0/29"
  }

  labels = {
    environment = var.environment
    tier        = "basic-hdd"
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.filestore]
}
```

## Basic SSD Tier

For workloads that need better IOPS and throughput, use the Basic SSD tier.

```hcl
# Basic SSD Filestore instance
resource "google_filestore_instance" "ssd" {
  name     = "fast-storage-${var.environment}"
  project  = var.project_id
  location = var.zone
  tier     = "BASIC_SSD"

  file_shares {
    name        = "fast_data"
    capacity_gb = 2560  # Minimum is 2.5 TB for Basic SSD

    nfs_export_options {
      ip_ranges   = [var.vpc_cidr]
      access_mode = "READ_WRITE"
      squash_mode = "NO_ROOT_SQUASH"
    }
  }

  networks {
    network = var.network_name
    modes   = ["MODE_IPV4"]
  }

  labels = {
    environment = var.environment
    tier        = "basic-ssd"
  }
}
```

## Enterprise Tier

The Enterprise tier provides regional availability with automatic replication across zones. Use it for production workloads that need high availability.

```hcl
# Enterprise Filestore instance with regional availability
resource "google_filestore_instance" "enterprise" {
  name     = "enterprise-storage-${var.environment}"
  project  = var.project_id
  location = var.region  # Enterprise tier uses region, not zone
  tier     = "ENTERPRISE"

  file_shares {
    name        = "enterprise_data"
    capacity_gb = 1024  # Minimum is 1 TB for Enterprise

    nfs_export_options {
      ip_ranges   = [var.vpc_cidr]
      access_mode = "READ_WRITE"
      squash_mode = "ROOT_SQUASH"
      anon_uid    = 65534
      anon_gid    = 65534
    }
  }

  networks {
    network = var.network_name
    modes   = ["MODE_IPV4"]
  }

  labels = {
    environment = var.environment
    tier        = "enterprise"
    ha          = "true"
  }
}
```

## Filestore with Snapshots

Snapshots let you create point-in-time backups of your file shares.

```hcl
# Filestore instance for production
resource "google_filestore_instance" "production" {
  name     = "prod-nfs-${var.environment}"
  project  = var.project_id
  location = var.zone
  tier     = "BASIC_SSD"

  file_shares {
    name        = "production_data"
    capacity_gb = 2560
  }

  networks {
    network = var.network_name
    modes   = ["MODE_IPV4"]
  }

  labels = {
    environment = "production"
  }
}

# Create a snapshot of the Filestore instance
resource "google_filestore_snapshot" "daily_snapshot" {
  name     = "daily-snapshot"
  instance = google_filestore_instance.production.name
  location = var.zone
  project  = var.project_id

  description = "Daily snapshot for backup purposes"

  labels = {
    backup_type = "daily"
  }
}
```

## Filestore Backup

For disaster recovery, Filestore supports backups that can be stored in a different region.

```hcl
# Filestore backup
resource "google_filestore_backup" "weekly_backup" {
  name              = "weekly-backup"
  location          = var.backup_region
  project           = var.project_id
  source_instance   = google_filestore_instance.production.id
  source_file_share = "production_data"

  description = "Weekly backup for disaster recovery"

  labels = {
    backup_type = "weekly"
    dr_region   = var.backup_region
  }
}
```

## Mounting Filestore on Compute Engine

After creating the instance, you need to mount it on your VMs. Here is how to automate that with a startup script.

```hcl
# Compute Engine instance that mounts the Filestore share
resource "google_compute_instance" "app_server" {
  name         = "app-server-${var.environment}"
  machine_type = "e2-standard-4"
  zone         = var.zone
  project      = var.project_id

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    subnetwork = var.subnet_self_link
  }

  # Startup script to mount Filestore
  metadata_startup_script = <<-SCRIPT
    #!/bin/bash
    # Install NFS client
    apt-get update && apt-get install -y nfs-common

    # Create mount point
    mkdir -p /mnt/shared

    # Mount the Filestore instance
    mount ${google_filestore_instance.basic.networks[0].ip_addresses[0]}:/${google_filestore_instance.basic.file_shares[0].name} /mnt/shared

    # Add to fstab for persistence across reboots
    echo "${google_filestore_instance.basic.networks[0].ip_addresses[0]}:/${google_filestore_instance.basic.file_shares[0].name} /mnt/shared nfs defaults 0 0" >> /etc/fstab
  SCRIPT

  service_account {
    email  = var.service_account_email
    scopes = ["cloud-platform"]
  }

  tags = ["app-server"]
}
```

## Using Filestore with GKE

For Kubernetes workloads, you can create a PersistentVolume backed by Filestore.

```hcl
# Output the Filestore IP and share name for Kubernetes configuration
output "filestore_ip" {
  description = "IP address of the Filestore instance"
  value       = google_filestore_instance.basic.networks[0].ip_addresses[0]
}

output "filestore_share_name" {
  description = "Name of the file share"
  value       = google_filestore_instance.basic.file_shares[0].name
}
```

Then in your Kubernetes manifests:

```yaml
# kubernetes/persistent-volume.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: filestore-pv
spec:
  capacity:
    storage: 1Ti
  accessModes:
    - ReadWriteMany
  nfs:
    server: <FILESTORE_IP>
    path: /data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: filestore-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Ti
  volumeName: filestore-pv
```

## Multiple File Shares

A single Filestore instance can serve one file share (for Basic and Zonal tiers) or multiple shares (for Enterprise tier). If you need multiple isolated shares, create multiple instances.

```hcl
# Multiple Filestore instances for different purposes
variable "file_shares" {
  type = map(object({
    capacity_gb = number
    tier        = string
    purpose     = string
  }))
  default = {
    "ml-datasets" = {
      capacity_gb = 2560
      tier        = "BASIC_SSD"
      purpose     = "machine-learning"
    }
    "app-uploads" = {
      capacity_gb = 1024
      tier        = "BASIC_HDD"
      purpose     = "user-uploads"
    }
    "shared-config" = {
      capacity_gb = 1024
      tier        = "BASIC_HDD"
      purpose     = "configuration"
    }
  }
}

resource "google_filestore_instance" "shares" {
  for_each = var.file_shares

  name     = "${each.key}-${var.environment}"
  project  = var.project_id
  location = var.zone
  tier     = each.value.tier

  file_shares {
    name        = replace(each.key, "-", "_")
    capacity_gb = each.value.capacity_gb
  }

  networks {
    network = var.network_name
    modes   = ["MODE_IPV4"]
  }

  labels = {
    environment = var.environment
    purpose     = each.value.purpose
    managed_by  = "terraform"
  }
}
```

## Cost and Performance Tips

Filestore pricing is based on provisioned capacity, not used capacity. A 1 TB Basic HDD instance costs the same whether you are using 10 GB or 900 GB. Size your instances based on your capacity needs plus growth projections.

Performance scales with capacity. Larger instances get more IOPS and throughput. If you need more performance, increasing the capacity is the primary lever.

Basic HDD has a minimum of 1 TB and Basic SSD has a minimum of 2.5 TB. Enterprise tier starts at 1 TB. These minimums can be surprising if you only need a small shared volume.

The Enterprise tier costs significantly more but provides regional availability and snapshots. For non-critical workloads, Basic tier with regular backups is often sufficient.

## Conclusion

Filestore fills an important gap in the GCP storage lineup. When you need shared POSIX-compliant storage that multiple VMs or containers can mount simultaneously, it is the managed solution that saves you from running your own NFS server. Terraform makes provisioning and managing these instances repeatable and consistent, which is especially valuable when you need the same storage setup across multiple environments.
