# How to Use Terraform to Provision RHEL 9 VMs on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, GCP, Terraform

Description: Step-by-step guide on use terraform to provision rhel 9 vms on gcp with practical examples and commands.

---

This guide covers provisioning RHEL 9 VMs on Google Cloud Platform using Terraform with proper networking and firewall rules.

## Prerequisites

- Terraform 1.5 or later
- gcloud CLI authenticated
- A GCP project with Compute Engine API enabled

## Define Variables

```hcl
# variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  default = "us-central1"
}

variable "zone" {
  default = "us-central1-a"
}

variable "machine_type" {
  default = "e2-medium"
}

variable "instance_count" {
  default = 2
}
```

## Main Configuration

```hcl
# main.tf
provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_compute_network" "vpc" {
  name                    = "rhel9-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "rhel9-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

resource "google_compute_firewall" "ssh" {
  name    = "rhel9-allow-ssh"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["rhel9"]
}

resource "google_compute_instance" "rhel9" {
  count        = var.instance_count
  name         = "rhel9-vm-${count.index + 1}"
  machine_type = var.machine_type
  zone         = var.zone
  tags         = ["rhel9"]

  boot_disk {
    initialize_params {
      image = "rhel-cloud/rhel-9"
      size  = 30
      type  = "pd-ssd"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id
    access_config {}
  }

  metadata = {
    ssh-keys = "admin:${file("~/.ssh/id_rsa.pub")}"
  }
}
```

## Outputs

```hcl
# outputs.tf
output "instance_ips" {
  value = google_compute_instance.rhel9[*].network_interface[0].access_config[0].nat_ip
}
```

## Deploy

```bash
terraform init
terraform plan -var="project_id=my-gcp-project"
terraform apply -var="project_id=my-gcp-project"
```

## Verify

```bash
gcloud compute instances list --filter="name~rhel9"
ssh admin@<external-ip>
```

## Clean Up

```bash
terraform destroy -var="project_id=my-gcp-project"
```

## Conclusion

You now have automated RHEL 9 VM provisioning on GCP with Terraform. Add persistent disks, instance groups, or load balancers to expand this foundation for production use.

