# How to Set Up GCP Preemptible VMs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Preemptible VMs, Cost Optimization, OpenTofu, Compute Engine, Batch

Description: Learn how to create GCP Preemptible VMs with OpenTofu for up to 80% cost savings on batch processing, fault-tolerant workloads, and development environments.

## Overview

GCP Preemptible VMs offer up to 80% savings compared to regular VMs but can be terminated by GCP at any time with up to 30 seconds of best-effort warning. Google recommends Spot VMs for new workloads, but preemptible VMs remain available and can run for a maximum of 24 hours at a time. They're ideal for batch jobs, CI/CD runners, stateless workers, and fault-tolerant distributed systems.

## Step 1: Create a Preemptible VM

```hcl
# main.tf - Preemptible VM for batch processing

resource "google_compute_instance" "preemptible_worker" {
  name         = "batch-worker-preemptible"
  machine_type = "n2-standard-4"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.self_link
  }

  # Enable preemptibility - this makes the VM up to 80% cheaper
  scheduling {
    preemptible         = true
    automatic_restart   = false  # Cannot auto-restart preemptible VMs
    on_host_maintenance = "TERMINATE"  # Required for preemptible VMs
  }

  # Startup script should handle resuming interrupted work
  metadata_startup_script = <<-SCRIPT
    #!/bin/bash
    # Pull work from a queue and process
    process_task() {
      local task="$1"
      # Replace this with your application-specific task handler.
      echo "Processing task: $task"
    }

    while true; do
      TASK_OBJECT=$(gsutil ls "gs://my-tasks-bucket/pending/*" 2>/dev/null | head -1)
      if [ -n "$TASK_OBJECT" ]; then
        TASK=$(gsutil cat "$TASK_OBJECT")
        process_task "$TASK"
      fi
      sleep 5
    done
  SCRIPT

  tags = ["preemptible-worker", "batch-job"]
}
```

## Step 2: Preemptible MIG for Batch Workloads

```hcl
# Instance template with preemptibility
resource "google_compute_instance_template" "preemptible_template" {
  name_prefix  = "preemptible-worker-"
  machine_type = "n2-standard-4"
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

  # Mark all instances in this template as preemptible
  scheduling {
    preemptible         = true
    automatic_restart   = false
    on_host_maintenance = "TERMINATE"
  }

  service_account {
    email  = google_service_account.batch_sa.email
    scopes = ["cloud-platform"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# MIG of preemptible workers
resource "google_compute_instance_group_manager" "preemptible_mig" {
  name               = "preemptible-worker-mig"
  zone               = "us-central1-a"
  base_instance_name = "worker"
  target_size        = 10

  version {
    name              = "v1"
    instance_template = google_compute_instance_template.preemptible_template.self_link
  }
}
```

## Step 3: Handling Preemption Gracefully

```hcl
# Shutdown script to save state before preemption
resource "google_compute_instance" "graceful_preemptible" {
  name         = "graceful-preemptible-vm"
  machine_type = "n2-standard-2"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }

  # Shutdown script runs during the best-effort preemption notice
  metadata = {
    shutdown-script = <<-SCRIPT
      #!/bin/bash
      # Save current progress to GCS before VM is terminated
      echo "Saving progress at $(date)" >> /var/log/shutdown.log
      gsutil cp /var/app/progress.json gs://my-batch-bucket/checkpoints/$(hostname).json
    SCRIPT
  }

  scheduling {
    preemptible         = true
    automatic_restart   = false
    on_host_maintenance = "TERMINATE"
  }
}
```

## Summary

GCP Preemptible VMs with OpenTofu reduce compute costs by up to 80% for fault-tolerant workloads, but they have a maximum runtime of 24 hours and up to 30 seconds of best-effort preemption notice. Google recommends Spot VMs for new workloads. Design your applications to checkpoint state to Cloud Storage or Pub/Sub so they can resume from where they left off after a preemption. Use MIGs of preemptible VMs with autoscaling for elastic batch processing pipelines.
