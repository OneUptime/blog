# How to Create GCP Spot VMs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Spot VMs, Cost Optimization, OpenTofu, Compute Engine, Infrastructure

Description: Learn how to create GCP Spot VMs with OpenTofu - the next generation of preemptible VMs with flexible interruption policies and up to 91% discount.

## Overview

GCP Spot VMs are the successor to Preemptible VMs, offering up to 91% discount on on-demand prices with more flexible configuration options and no 24-hour maximum runtime by default. They're ideal for batch processing, ML training, and CI/CD workloads.

## Step 1: Create a Spot VM

```hcl
# main.tf - Spot VM instance

resource "google_compute_instance" "spot_vm" {
  name         = "spot-vm-worker"
  machine_type = "n2-standard-4"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.self_link
  }

  scheduling {
    preemptible = true

    # "SPOT" is the provisioning model for Spot VMs
    provisioning_model  = "SPOT"
    on_host_maintenance = "TERMINATE"
    automatic_restart   = false

    # Optional: specify instance termination action
    # "STOP" keeps the instance and attached persistent disks; "DELETE" deletes it
    instance_termination_action = "STOP"
  }

  service_account {
    email  = google_service_account.vm_sa.email
    scopes = ["cloud-platform"]
  }
}
```

## Step 2: Spot VM with GPU for ML Training

```hcl
# Spot VM with GPU for cost-effective ML training
resource "google_compute_instance" "spot_gpu_vm" {
  name         = "ml-training-spot"
  machine_type = "n1-standard-8"
  zone         = "us-central1-b"

  boot_disk {
    initialize_params {
      image = "deeplearning-platform-release/pytorch-latest-gpu"
      size  = 100
    }
  }

  # Attach NVIDIA T4 GPU
  guest_accelerator {
    type  = "nvidia-tesla-t4"
    count = 1
  }

  metadata = {
    "install-nvidia-driver" = "True"
  }

  scheduling {
    preemptible                 = true
    provisioning_model          = "SPOT"
    on_host_maintenance         = "TERMINATE"
    automatic_restart           = false
    instance_termination_action = "STOP"
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.self_link
  }
}
```

## Step 3: Spot VM Instance Template for MIG

```hcl
# Instance template using Spot provisioning
resource "google_compute_instance_template" "spot_template" {
  name_prefix  = "spot-worker-"
  machine_type = "c2-standard-8"  # Compute-optimized for batch processing
  region       = "us-central1"

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 50
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.self_link
  }

  scheduling {
    preemptible                 = true
    provisioning_model          = "SPOT"
    on_host_maintenance         = "TERMINATE"
    automatic_restart           = false
    instance_termination_action = "DELETE"
  }

  metadata_startup_script = file("${path.module}/scripts/worker-startup.sh")

  lifecycle {
    create_before_destroy = true
  }
}
```

## Step 4: Outputs

```hcl
output "spot_vm_self_link" {
  value = google_compute_instance.spot_vm.self_link
}

output "spot_vm_status" {
  value = google_compute_instance.spot_vm.current_status
}
```

## Summary

GCP Spot VMs with OpenTofu deliver deep discounts on compute resources. Using `instance_termination_action = "STOP"` keeps the instance definition and attached persistent disks after preemption, which can simplify recovery for stateful workloads. Spot VMs in MIGs provide a cost-effective, elastic compute pool for batch and ML workloads.
