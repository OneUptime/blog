# How to Deploy Portainer on Google Cloud Compute Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Google Cloud, GCP, Compute Engine, Docker, Self-Hosted

Description: Learn how to provision a GCP Compute Engine VM and deploy Portainer CE for managing Docker containers on Google Cloud.

---

Google Cloud Compute Engine provides scalable VM instances for running Docker workloads. OpenTofu's `google` provider provisions the VM and startup script installs Docker and Portainer automatically.

---

## Create a GCE Instance with OpenTofu

```hcl
resource "google_compute_instance" "portainer" {
  name         = "portainer"
  machine_type = "e2-small"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 20
    }
  }

  network_interface {
    network = "default"
    access_config {}  # Assigns an ephemeral public IP
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y ca-certificates curl
    curl -fsSL https://get.docker.com | sh

    docker volume create portainer_data

    docker run -d       --name portainer       --restart=always       -p 9443:9443       -v /var/run/docker.sock:/var/run/docker.sock       -v portainer_data:/data       portainer/portainer-ce:lts
  EOF

  tags = ["portainer"]
}
```

---

## Create Firewall Rule for Portainer

```hcl
variable "admin_ip_cidr" {
  description = "CIDR block allowed to access Portainer"
  type        = string
}

resource "google_compute_firewall" "portainer" {
  name    = "allow-portainer"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["9443"]
  }

  source_ranges = [var.admin_ip_cidr]
  target_tags   = ["portainer"]
}
```

---

## Output the Public IP

```hcl
output "portainer_ip" {
  value = google_compute_instance.portainer.network_interface[0].access_config[0].nat_ip
}

output "portainer_url" {
  value = "https://${google_compute_instance.portainer.network_interface[0].access_config[0].nat_ip}:9443"
}
```

---

## Use a Static IP

```hcl
resource "google_compute_address" "portainer" {
  name   = "portainer-ip"
  region = "us-central1"
}

resource "google_compute_instance" "portainer" {
  # ...
  network_interface {
    network = "default"
    access_config {
      nat_ip = google_compute_address.portainer.address
    }
  }
}
```

---

## Summary

Use `metadata_startup_script` to install Docker and launch Portainer on GCE instance creation. Create a firewall rule with `target_tags` matching the instance's tags to restrict port 9443 access. Optionally, reserve a static IP with `google_compute_address` for a stable Portainer URL that survives VM restarts.
