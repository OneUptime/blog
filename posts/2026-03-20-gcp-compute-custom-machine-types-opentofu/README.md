# How to Create GCP Compute Instances with Custom Machine Types in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, OpenTofu, Custom Machine Types, Infrastructure, Cloud

Description: Learn how to create GCP Compute Engine instances with custom machine types using OpenTofu to precisely specify vCPU and memory for cost optimization.

## Overview

GCP allows you to create custom machine types with exact vCPU and memory configurations instead of using predefined instance sizes. This lets you right-size VMs precisely for your workloads and avoid paying for unused resources.

## Step 1: Custom Machine Type Syntax

For N1 custom machine types, GCP uses the format `custom-{vCPUs}-{memoryMB}`. Other supported series use `{series}-custom-{vCPUs}-{memoryMB}`. On supported series, extended memory adds the `-ext` suffix, for example `custom-{vCPUs}-{memoryMB}-ext` on N1 or `n2-custom-{vCPUs}-{memoryMB}-ext` on N2.

```hcl
# main.tf - N1 custom machine type with specific vCPU and memory

resource "google_compute_instance" "custom_vm" {
  name         = "my-custom-vm"
  zone         = "us-central1-a"
  # N1 custom machine type: 4 vCPUs, 8192 MB (8 GB) RAM
  machine_type = "custom-4-8192"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
      type  = "pd-ssd"
    }
  }

  network_interface {
    network    = "default"
    subnetwork = "default"

    access_config {}  # Assigns an ephemeral external IP
  }

  tags = ["custom-vm", "app-server"]
}
```

## Step 2: N2 Custom Machine Type

```hcl
# N2 series custom machine type for better price/performance
resource "google_compute_instance" "n2_custom" {
  name         = "n2-custom-vm"
  zone         = "us-central1-a"
  # N2 custom: 8 vCPUs, 16384 MB (16 GB) RAM
  machine_type = "n2-custom-8-16384"

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 100
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.self_link
  }

  # Service account for GCP API access
  service_account {
    email  = google_service_account.vm_sa.email
    scopes = ["cloud-platform"]
  }
}
```

## Step 3: Extended Memory Custom Machine Type

```hcl
# Extended memory: more RAM per vCPU than standard ratios allow
resource "google_compute_instance" "extended_memory_vm" {
  name         = "extended-mem-vm"
  zone         = "us-central1-a"
  # Extended memory: 4 vCPUs, 32768 MB (32 GB) - exceeds standard 6.5GB/vCPU ratio
  machine_type = "custom-4-32768-ext"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
    }
  }

  network_interface {
    network = "default"
  }
}
```

## Step 4: Dynamic Machine Type from Variables

```hcl
# variables.tf - Define machine specs
variable "vcpus" {
  type    = number
  default = 2
}

variable "memory_mb" {
  type    = number
  default = 4096
}

# Construct an N1 custom machine type string from variables
locals {
  machine_type = "custom-${var.vcpus}-${var.memory_mb}"
}

resource "google_compute_instance" "dynamic_vm" {
  name         = "dynamic-custom-vm"
  zone         = "us-central1-a"
  machine_type = local.machine_type

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}
```

## Summary

GCP custom machine types with OpenTofu let you optimize VM costs by specifying exact vCPU and memory configurations. Use standard custom types for workloads within the default memory-per-vCPU ratio for your chosen machine series, and extended memory types for memory-intensive applications like in-memory databases or analytics workloads.
