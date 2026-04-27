# How to Use Packer-Built Images in OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Packer, GCP, Custom Image, Compute Engine

Description: Learn how to build custom GCP Compute Engine images with Packer and reference them in OpenTofu configurations for consistent, immutable VM and MIG deployments.

## Introduction

Packer's `googlecompute` builder creates GCP Compute Engine custom images. OpenTofu then uses these images via data sources in instance templates for Managed Instance Groups (MIGs), enabling rolling updates when new images are available.

## Packer Template for GCP

```hcl
# packer/gcp-web-server.pkr.hcl

packer {
  required_plugins {
    googlecompute = {
      version = ">= 1.1.0"
      source  = "github.com/hashicorp/googlecompute"
    }
  }
}

variable "project_id" {
  type = string
}

variable "app_version" {
  type    = string
  default = "1.0.0"
}

locals {
  image_name = "web-server-${replace(var.app_version, ".", "-")}-${formatdate("YYYYMMDD-hhmmss", timestamp())}"
}

source "googlecompute" "web_server" {
  project_id              = var.project_id
  source_image_family     = "ubuntu-2204-lts"
  source_image_project_id = ["ubuntu-os-cloud"]
  zone                    = "us-central1-a"
  image_name              = local.image_name
  image_family            = "web-server"
  image_description       = "Web server image - app version ${var.app_version}"
  machine_type            = "n2-standard-2"
  ssh_username            = "packer"
  disk_size               = 20

  image_labels = {
    application = "web-server"
    version     = replace(var.app_version, ".", "-")
    managed_by  = "packer"
  }
}

build {
  sources = ["source.googlecompute.web_server"]

  provisioner "shell" {
    inline = [
      "sudo apt-get update -y",
      "sudo apt-get install -y nginx curl python3",
      "sudo systemctl enable nginx",
    ]
  }

  provisioner "file" {
    source      = "scripts/install-app.sh"
    destination = "/tmp/install-app.sh"
  }

  provisioner "shell" {
    environment_vars = ["APP_VERSION=${var.app_version}"]
    inline = [
      "chmod +x /tmp/install-app.sh",
      "sudo -E /tmp/install-app.sh",
    ]
  }
}
```

## OpenTofu Data Source for GCP Images

```hcl
# Get the most recent image from the web-server family
data "google_compute_image" "web_server" {
  project = var.project_id
  family  = "web-server"
  # most_recent is implicit for family-based lookups
}

# Get a specific image by name
data "google_compute_image" "web_server_v1_2" {
  project = var.project_id
  name    = "web-server-1-2-0-20250115-120000"
}
```

## Using the Image in a Managed Instance Group

```hcl
resource "google_compute_instance_template" "web" {
  name_prefix  = "web-server-"
  machine_type = "n2-standard-2"

  disk {
    source_image = data.google_compute_image.web_server.self_link
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
    disk_type    = "pd-ssd"
  }

  network_interface {
    network    = google_compute_network.main.self_link
    subnetwork = google_compute_subnetwork.web.self_link
  }

  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      echo "APP_ENV=${var.environment}" >> /etc/app/environment
      systemctl start app
    EOF
  }

  service_account {
    email  = google_service_account.web.email
    scopes = ["cloud-platform"]
  }

  labels = {
    environment   = var.environment
    image_version = data.google_compute_image.web_server.labels["version"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_region_instance_group_manager" "web" {
  name               = "web-mig"
  base_instance_name = "web"
  region             = var.region

  version {
    instance_template = google_compute_instance_template.web.id
    name              = "primary"
  }

  target_size = 3

  named_port {
    name = "http"
    port = 80
  }

  update_policy {
    type                  = "PROACTIVE"
    minimal_action        = "REPLACE"
    max_surge_fixed       = 3
    max_unavailable_fixed = 0
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.web.id
    initial_delay_sec = 300
  }
}
```

## Image Family for Rolling Updates

```hcl
# The image family always points to the latest image in that family
# When Packer publishes a new image to the "web-server" family,
# the next tofu apply picks it up automatically

locals {
  # Embed the image self_link in the template name to force template recreation
  image_checksum = data.google_compute_image.web_server.id
}

resource "google_compute_instance_template" "web" {
  name = "web-server-${substr(md5(local.image_checksum), 0, 8)}"
  # ...
}
```

## Conclusion

GCP's image family concept aligns perfectly with the Packer + OpenTofu workflow: Packer always publishes to the `web-server` family, and OpenTofu's data source retrieves the latest image from that family. New images automatically trigger template recreation on the next `tofu apply`, and the MIG's `update_policy` controls how the rollout proceeds across the instance group.
