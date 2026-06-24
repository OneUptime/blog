# How to Create GCP Machine Images with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Machine Image, Compute Engine, OpenTofu, Infrastructure, Golden Image

Description: Learn how to create GCP Machine Images with OpenTofu to capture complete VM state including all disks and configuration for cloning and disaster recovery.

## Overview

GCP Machine Images store a Compute Engine instance's configuration, metadata, permissions, and data from multiple disks. Unlike snapshots, which back up a single disk at a time, machine images can capture multi-disk VMs and serve as sources for cloned instances.

## Step 1: Create a Machine Image from an Existing VM

```hcl
# main.tf - Source VM to create a machine image from

resource "google_compute_instance" "source_vm" {
  provider     = google-beta
  name         = "golden-image-source"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
    }
  }

  network_interface {
    network = "default"
  }

  # Setup script to install and configure software
  metadata_startup_script = <<-SCRIPT
    #!/bin/bash
    apt-get update
    apt-get install -y nginx python3 python3-flask gunicorn
    systemctl enable nginx
  SCRIPT
}

# Create a machine image from the configured VM
resource "google_compute_machine_image" "golden_image" {
  provider        = google-beta
  name            = "golden-app-image-v1"
  description     = "Golden image with nginx and Python app stack"
  source_instance = google_compute_instance.source_vm.self_link

  # Optionally encrypt the machine image with a CMEK key
  machine_image_encryption_key {
    kms_key_name = google_kms_crypto_key.image_key.id
  }
}
```

## Step 2: Create an Instance from a Machine Image

```hcl
# Create a new VM from the machine image
resource "google_compute_instance_from_machine_image" "vm_from_image" {
  provider     = google-beta
  name         = "app-server-from-image"
  machine_type = "e2-medium"
  zone         = "us-central1-b"

  # Use the machine image as the source (not a disk image)
  source_machine_image = google_compute_machine_image.golden_image.self_link

  # Network configuration (overrides the source VM's network)
  network_interface {
    subnetwork = google_compute_subnetwork.subnet.self_link
  }

  # Override app settings for the new environment
  metadata = {
    ENVIRONMENT = "production"
  }
}
```

## Step 3: Machine Image with Multiple Disks

```hcl
# Source VM with multiple disks
resource "google_compute_instance" "multi_disk_source" {
  provider     = google-beta
  name         = "multi-disk-source"
  machine_type = "n2-standard-4"
  zone         = "us-central1-a"

  # Boot disk
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
    }
  }

  # Additional data disk
  attached_disk {
    source      = google_compute_disk.data_disk.self_link
    device_name = "data-disk"
  }

  network_interface {
    network = "default"
  }
}

resource "google_compute_disk" "data_disk" {
  provider = google-beta
  name     = "app-data-disk"
  type     = "pd-ssd"
  zone     = "us-central1-a"
  size     = 200
}

# Machine image captures both attached persistent disks (boot + data)
resource "google_compute_machine_image" "complete_image" {
  provider        = google-beta
  name            = "complete-app-image"
  source_instance = google_compute_instance.multi_disk_source.self_link
}
```

## Step 4: Outputs

```hcl
output "machine_image_self_link" {
  value       = google_compute_machine_image.golden_image.self_link
  description = "Machine image self link for creating instances"
}
```

## Summary

GCP Machine Images with OpenTofu enable instance-cloning workflows where you configure one VM, capture it as a machine image, and then create new instances with most of the same configuration. Unlike disk snapshots, machine images store VM configuration plus data from multiple disks, making them useful for multi-disk backup, cloning, and DR recovery.
