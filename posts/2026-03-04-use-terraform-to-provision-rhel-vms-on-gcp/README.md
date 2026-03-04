# How to Use Terraform to Provision RHEL VMs on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Terraform, GCP, IaC, Automation, Cloud

Description: Provision RHEL virtual machines on Google Cloud Platform using Terraform with the Google provider, including firewall rules and startup scripts.

---

Terraform's Google provider lets you declare RHEL VM instances on GCP in code. This guide covers creating a RHEL 9 Compute Engine instance.

## Terraform Configuration

```hcl
# main.tf - Provision a RHEL 9 VM on GCP

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = "my-gcp-project"
  region  = "us-central1"
  zone    = "us-central1-a"
}

# RHEL 9 Compute Engine instance
resource "google_compute_instance" "rhel" {
  name         = "rhel9-terraform"
  machine_type = "e2-medium"

  boot_disk {
    initialize_params {
      # Official RHEL 9 image from the rhel-cloud project
      image = "rhel-cloud/rhel-9"
      size  = 30
      type  = "pd-balanced"
    }
  }

  network_interface {
    network = "default"

    # Assign an external IP
    access_config {}
  }

  # Add your SSH key via metadata
  metadata = {
    ssh-keys = "admin:${file("~/.ssh/id_rsa.pub")}"
  }

  tags = ["allow-ssh"]
}

# Firewall rule to allow SSH
resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh-rhel"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"] # Restrict in production
  target_tags   = ["allow-ssh"]
}

output "instance_ip" {
  value = google_compute_instance.rhel.network_interface[0].access_config[0].nat_ip
}
```

## Deploy

```bash
# Set up authentication
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Initialize and apply
terraform init
terraform plan
terraform apply -auto-approve
```

## Verify

```bash
# SSH into the new instance
gcloud compute ssh rhel9-terraform --zone us-central1-a

# Verify the RHEL version
cat /etc/redhat-release
```

## Listing Available RHEL Images

```bash
# List all RHEL images available on GCP
gcloud compute images list --project rhel-cloud --filter="name~rhel-9"
```

Destroy all resources with `terraform destroy` when no longer needed.
