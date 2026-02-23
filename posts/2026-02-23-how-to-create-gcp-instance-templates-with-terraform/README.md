# How to Create GCP Instance Templates with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Compute Engine, Instance Templates, Infrastructure as Code

Description: A practical guide to creating GCP Compute Engine instance templates with Terraform, covering machine types, disks, networking, metadata, and versioning strategies.

---

Instance templates are the blueprint for creating VM instances in Google Cloud. They define everything about a VM - the machine type, boot disk, network configuration, metadata, and more. While you can create individual VMs directly, instance templates become essential when working with Managed Instance Groups, which use them to create identical VMs at scale.

In this guide, we will build several instance templates with Terraform, covering common patterns you will run into in real projects.

## Why Instance Templates Matter

You might wonder why you need a separate template resource when you can just define VMs directly. The key reasons are:

- Managed Instance Groups require instance templates
- Templates are immutable, which makes rollbacks simple - just point back to the previous template
- They serve as documentation for your VM configuration
- Templates enable canary deployments where you run two template versions side by side

## Provider Configuration

Start with the basic provider setup:

```hcl
# Configure the Google Cloud provider
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
  region  = var.region
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}
```

## Basic Instance Template

Here is a straightforward instance template for a web server:

```hcl
# Basic instance template for a web server
resource "google_compute_instance_template" "web" {
  name         = "web-server-template"
  machine_type = "e2-medium"
  region       = var.region

  # Boot disk configuration
  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
    disk_type    = "pd-balanced"
  }

  # Network interface with external IP
  network_interface {
    network    = "default"
    subnetwork = "default"

    # Include access_config for a public IP
    access_config {
      # Ephemeral IP - leave nat_ip empty
    }
  }

  # Instance metadata
  metadata = {
    enable-oslogin = "TRUE"
  }

  tags = ["http-server", "https-server"]
}
```

This creates a template but has a problem: the `name` field is fixed. Since instance templates are immutable in GCP, Terraform cannot update them in place. It has to destroy the old one and create a new one, which will fail if a MIG is still using it.

## Using name_prefix for Safe Updates

The solution is `name_prefix` combined with the `create_before_destroy` lifecycle rule:

```hcl
# Instance template with safe update strategy
resource "google_compute_instance_template" "web_safe" {
  name_prefix  = "web-server-"
  machine_type = "e2-medium"
  region       = var.region

  # This is critical - create the new template before destroying the old one
  lifecycle {
    create_before_destroy = true
  }

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
    disk_type    = "pd-balanced"
  }

  network_interface {
    network    = google_compute_network.main.id
    subnetwork = google_compute_subnetwork.main.id
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  tags = ["http-server"]
}
```

With `name_prefix`, Terraform appends a random suffix to each template name (like `web-server-abc123`). When you make changes, it creates the new template first, updates any MIG references, and then destroys the old template.

## Template with Custom Network and Service Account

In production, you will typically use a custom VPC and a dedicated service account:

```hcl
# Custom VPC network
resource "google_compute_network" "main" {
  name                    = "main-network"
  auto_create_subnetworks = false
}

# Subnet in the primary region
resource "google_compute_subnetwork" "main" {
  name          = "main-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

# Dedicated service account for the VMs
resource "google_service_account" "vm_sa" {
  account_id   = "vm-service-account"
  display_name = "VM Service Account"
}

# Grant the service account necessary permissions
resource "google_project_iam_member" "vm_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.vm_sa.email}"
}

resource "google_project_iam_member" "vm_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.vm_sa.email}"
}

# Instance template with custom networking and service account
resource "google_compute_instance_template" "production" {
  name_prefix  = "prod-server-"
  machine_type = "n2-standard-4"
  region       = var.region

  lifecycle {
    create_before_destroy = true
  }

  # Boot disk
  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 50
    disk_type    = "pd-ssd"

    # Encrypt the disk with a customer-managed key (optional)
    # disk_encryption_key {
    #   kms_key_self_link = google_kms_crypto_key.disk_key.id
    # }
  }

  # No external IP - instances stay private
  network_interface {
    network    = google_compute_network.main.id
    subnetwork = google_compute_subnetwork.main.id
    # No access_config block means no external IP
  }

  # Use the dedicated service account with minimal scopes
  service_account {
    email  = google_service_account.vm_sa.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin = "TRUE"
    startup-script = file("${path.module}/scripts/startup.sh")
  }

  # Shielded VM settings for extra security
  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  tags = ["internal", "web"]

  labels = {
    environment = "production"
    team        = "platform"
  }
}
```

## Template with Multiple Disks

Some workloads need additional disks for data storage. You can attach multiple disks in the template:

```hcl
# Instance template with additional data disk
resource "google_compute_instance_template" "database" {
  name_prefix  = "db-server-"
  machine_type = "n2-highmem-8"
  region       = var.region

  lifecycle {
    create_before_destroy = true
  }

  # Boot disk - smaller, standard
  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
    disk_type    = "pd-balanced"
  }

  # Data disk - larger, SSD for performance
  disk {
    auto_delete  = true
    boot         = false
    disk_size_gb = 500
    disk_type    = "pd-ssd"
    device_name  = "data-disk"

    # This labels the disk so the startup script can find and mount it
    disk_name = "data"
  }

  network_interface {
    network    = google_compute_network.main.id
    subnetwork = google_compute_subnetwork.main.id
  }

  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      # Format and mount the data disk if not already done
      DEVICE="/dev/disk/by-id/google-data-disk"
      MOUNT_POINT="/mnt/data"

      if ! blkid $DEVICE; then
        mkfs.ext4 -F $DEVICE
      fi

      mkdir -p $MOUNT_POINT
      mount $DEVICE $MOUNT_POINT
      echo "$DEVICE $MOUNT_POINT ext4 defaults 0 2" >> /etc/fstab
    EOF
  }

  tags = ["database"]
}
```

## Preemptible and Spot Instance Templates

For cost-sensitive workloads that can tolerate interruptions, use Spot VMs:

```hcl
# Spot instance template for batch processing jobs
resource "google_compute_instance_template" "batch_worker" {
  name_prefix  = "batch-worker-"
  machine_type = "c2-standard-8"
  region       = var.region

  lifecycle {
    create_before_destroy = true
  }

  # Spot VM scheduling configuration
  scheduling {
    preemptible                 = true
    automatic_restart           = false
    on_host_maintenance         = "TERMINATE"
    provisioning_model          = "SPOT"
    instance_termination_action = "STOP"
  }

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 50
    disk_type    = "pd-standard"
  }

  network_interface {
    network    = google_compute_network.main.id
    subnetwork = google_compute_subnetwork.main.id
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  tags = ["batch-worker"]
}
```

Spot VMs can save you 60-91% compared to regular instances, but GCP can reclaim them at any time. The `instance_termination_action` set to `STOP` means the VM will be stopped rather than deleted, so you can restart it when capacity is available again.

## GPU-Attached Instance Template

For machine learning or rendering workloads:

```hcl
# Instance template with GPU for ML workloads
resource "google_compute_instance_template" "gpu_worker" {
  name_prefix  = "gpu-worker-"
  machine_type = "n1-standard-8"
  region       = var.region

  lifecycle {
    create_before_destroy = true
  }

  # GPU attachment
  guest_accelerator {
    type  = "nvidia-tesla-t4"
    count = 1
  }

  # Required scheduling for GPU instances
  scheduling {
    on_host_maintenance = "TERMINATE"
    automatic_restart   = true
  }

  disk {
    source_image = "deeplearning-platform-release/common-cu121-v20240128-debian-11-py310"
    auto_delete  = true
    boot         = true
    disk_size_gb = 200
    disk_type    = "pd-ssd"
  }

  network_interface {
    network    = google_compute_network.main.id
    subnetwork = google_compute_subnetwork.main.id
  }

  tags = ["gpu-worker"]
}
```

## Outputs

```hcl
output "web_template_id" {
  description = "ID of the web server instance template"
  value       = google_compute_instance_template.web_safe.id
}

output "production_template_id" {
  description = "ID of the production instance template"
  value       = google_compute_instance_template.production.id
}

output "production_template_self_link" {
  description = "Self-link of the production template for MIG references"
  value       = google_compute_instance_template.production.self_link
}
```

## Best Practices

**Always use `name_prefix` with `create_before_destroy`.** This is not optional for production use. Without it, template updates will fail if anything references the old template.

**Use custom service accounts.** Never use the default Compute Engine service account in production. Create a dedicated service account with only the permissions your application needs.

**Enable Shielded VM features.** Secure boot, vTPM, and integrity monitoring add security with no performance cost.

**Keep startup scripts in separate files.** For anything beyond a few lines, use `file()` to load scripts from the filesystem. This keeps your Terraform code readable and lets you test scripts independently.

**Use labels consistently.** Labels are how you track costs, filter resources, and apply policies. Standardize on a labeling scheme across your team.

## Conclusion

Instance templates are a foundational piece of GCP infrastructure. They are simple on the surface but have enough configuration options to handle everything from basic web servers to GPU-equipped ML workers. The key things to remember are: use `name_prefix` for safe updates, keep instances private when possible, and use dedicated service accounts.

For the next step, check out how to use these templates with [Managed Instance Groups](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-managed-instance-groups-with-terraform/view) to run your VMs at scale.
