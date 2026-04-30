# How to Configure GCP VM Metadata and Startup Scripts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Startup Scripts, OpenTofu, Metadata, Configuration

Description: Learn how to configure GCP Compute Engine VM metadata and startup scripts with OpenTofu for automated instance configuration and bootstrapping.

## Overview

GCP VM metadata stores key-value pairs accessible from within the VM at `metadata.google.internal`. Startup scripts use metadata to run initialization code when instances boot. OpenTofu manages both metadata configuration and script injection.

## Step 1: VM with Inline Startup Script

```hcl
# main.tf - VM with startup script in metadata

resource "google_compute_instance" "web_server" {
  name         = "web-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.self_link
    access_config {}
  }

  # Metadata key-value pairs available inside the VM
  metadata = {
    APP_VERSION     = "2.1.0"
    ENVIRONMENT     = "production"
    DB_HOST         = google_sql_database_instance.db.private_ip_address
    REGION          = var.region
    # startup-script is a special metadata key
    startup-script  = <<-SCRIPT
      #!/bin/bash
      set -euxo pipefail

      # Read metadata values from the metadata server
      APP_VERSION=$(curl -s -H "Metadata-Flavor: Google" \
        http://metadata.google.internal/computeMetadata/v1/instance/attributes/APP_VERSION)

      apt-get update -y
      apt-get install -y nginx

      echo "App version: $APP_VERSION" > /var/www/html/version.txt
      systemctl start nginx
    SCRIPT
  }
}
```

## Step 2: External Startup Script File

```hcl
# Load startup script from an external file
resource "google_compute_instance" "app_server" {
  name         = "app-server"
  machine_type = "n2-standard-2"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.self_link
  }

  metadata = {
    # Load script from a file - use templatefile for variable substitution
    startup-script = templatefile("${path.module}/scripts/app-setup.sh", {
      db_host      = google_sql_database_instance.db.private_ip_address
      app_version  = var.app_version
      project_id   = var.project_id
    })

    # Shutdown script runs on graceful shutdown
    shutdown-script = file("${path.module}/scripts/app-shutdown.sh")
  }
}
```

## Step 3: Startup Script from Cloud Storage

```hcl
# VM that fetches startup script from GCS
resource "google_compute_instance" "gcs_script_vm" {
  name         = "gcs-script-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  depends_on = [
    google_storage_bucket_object.startup_script,
    google_storage_bucket_iam_member.startup_script_reader,
  ]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.self_link
    access_config {}
  }

  service_account {
    email  = google_service_account.vm_sa.email
    scopes = ["storage-ro"]
  }

  metadata = {
    # GCS URI to startup script - VM downloads and executes it
    startup-script-url = "gs://${google_storage_bucket.scripts_bucket.name}/${google_storage_bucket_object.startup_script.name}"
  }
}

# Upload the startup script to GCS
resource "google_storage_bucket_object" "startup_script" {
  name   = "startup/app-setup.sh"
  bucket = google_storage_bucket.scripts_bucket.name
  source = "${path.module}/scripts/app-setup.sh"
}

# Allow the VM service account to read the startup script from GCS
resource "google_storage_bucket_iam_member" "startup_script_reader" {
  bucket = google_storage_bucket.scripts_bucket.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.vm_sa.email}"
}
```

## Step 4: Project-Level Metadata

```hcl
# Set metadata at project level - applies to all VMs
resource "google_compute_project_metadata" "project_metadata" {
  metadata = {
    enable-oslogin             = "FALSE"
    serial-port-logging-enable = "false"
    # SSH keys for project-level access when OS Login is disabled
    ssh-keys = "user:${file(pathexpand("~/.ssh/id_rsa.pub"))}"
  }
}
```

## Summary

GCP VM metadata and startup scripts with OpenTofu provide a flexible mechanism for bootstrapping Compute Engine instances. Use `templatefile` to inject dynamic values into scripts, store complex scripts in GCS for versioning, and leverage project-level metadata for settings that apply to all VMs in a project.
