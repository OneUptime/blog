# How to Import GCP Compute Instances into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, GCP, Compute Engine, Import, Google Cloud

Description: Learn how to import existing GCP Compute Engine instances into OpenTofu state, writing matching HCL configurations for instance settings, disks, and network interfaces.

## Introduction

GCP Compute Engine instances created via gcloud, the console, or Deployment Manager can be imported into OpenTofu. The import ID format uses the project, zone, and instance name.

## Step 1: Gather Instance Information

```bash
PROJECT="my-project-id"
ZONE="us-central1-a"
INSTANCE="my-app-vm"

# Get instance details

gcloud compute instances describe "$INSTANCE" \
  --zone="$ZONE" \
  --project="$PROJECT" \
  --format=json | jq '{
    machine_type: .machineType | split("/") | last,
    boot_disk: (.disks[] | select(.boot == true) | .source | split("/") | last),
    boot_auto_delete: (.disks[] | select(.boot == true) | .autoDelete),
    network: .networkInterfaces[0].network | split("/") | last,
    subnetwork: .networkInterfaces[0].subnetwork | split("/") | last,
    external_ip: (.networkInterfaces[0].accessConfigs[0].natIP // null),
    service_account: (.serviceAccounts[0].email // null),
    scopes: (.serviceAccounts[0].scopes // []),
    tags: (.tags.items // []),
    labels: (.labels // {}),
    metadata: ((.metadata.items // []) | from_entries)
  }'
```

## Step 2: Write Matching HCL

```hcl
resource "google_compute_instance" "app" {
  name         = "my-app-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
  project      = var.project_id

  # Boot disk configuration
  boot_disk {
    source      = "my-app-vm"
    auto_delete = true
  }

  network_interface {
    network    = "my-vpc-network"
    subnetwork = "my-private-subnet"

    # Omit access_config if no external IP.
    # Use an empty block for an ephemeral external IP:
    # access_config {}
    # Set nat_ip only when the VM uses a reserved static external IP.
    # access_config {
    #   nat_ip = "203.0.113.10"
    # }
  }

  service_account {
    email  = "my-app-sa@my-project-id.iam.gserviceaccount.com"
    scopes = ["cloud-platform"]
  }

  tags = ["app-server", "allow-internal"]

  labels = {
    environment = "prod"
    managed_by  = "opentofu"
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  lifecycle {
    # Required if non-boot disks are managed with google_compute_attached_disk.
    ignore_changes = [attached_disk]
  }
}
```

## Step 3: Import Block

```hcl
# import.tf
# GCP import ID format: PROJECT/ZONE/INSTANCE_NAME
import {
  to = google_compute_instance.app
  id = "my-project-id/us-central1-a/my-app-vm"
}
```

## Importing Additional Disks

```hcl
resource "google_compute_disk" "data" {
  name    = "my-app-data-disk"
  type    = "pd-ssd"
  zone    = "us-central1-a"
  project = var.project_id
  size    = 100
}

resource "google_compute_attached_disk" "data" {
  disk     = google_compute_disk.data.self_link
  instance = google_compute_instance.app.self_link
  zone     = "us-central1-a"
}

import {
  to = google_compute_disk.data
  id = "my-project-id/us-central1-a/my-app-data-disk"
}

# Attached disk import ID: project/zone/instance/disk
import {
  to = google_compute_attached_disk.data
  id = "my-project-id/us-central1-a/my-app-vm/my-app-data-disk"
}
```

## Handling Preemptible and Spot Instances

```hcl
resource "google_compute_instance" "worker" {
  name         = "batch-worker"
  machine_type = "n2-standard-4"
  zone         = "us-central1-a"

  scheduling {
    preemptible                  = true
    automatic_restart            = false
    on_host_maintenance          = "TERMINATE"
    provisioning_model           = "SPOT"
    instance_termination_action  = "STOP"
  }

  # boot_disk and network_interface as above...
}
```

## Conclusion

GCP Compute instances use the `PROJECT/ZONE/INSTANCE_NAME` format for import IDs. When importing an existing VM, reference the existing boot disk in `boot_disk.source` so the configuration matches the instance that already exists. If you manage extra data disks with `google_compute_attached_disk`, add `ignore_changes = [attached_disk]` on the instance resource so the two resources do not fight over the same attachments.
