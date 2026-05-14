# How to Use Terraform to Provision RHEL 9 VMs on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Terraform, GCP, Infrastructure as Code

Description: Learn how to use Terraform to automate provisioning of RHEL 9 virtual machines on GCP.

---

## Overview

Use Terraform to provision RHEL 9 VMs on GCP. RHEL 9 is fully supported on major cloud platforms with official images and integrated tooling.

## Prerequisites

- A Google Cloud project with billing enabled for RHEL on-demand images, or a Red Hat Cloud Access subscription for BYOS images
- Permission to create Compute Engine resources in the Google Cloud project
- Terraform and the Google Cloud CLI installed

## Step 1 - Choose Your Deployment Method

You can deploy RHEL 9 on Google Cloud using:

1. **Marketplace images** - pre-built, official Red Hat images
2. **Custom images** - built with Image Builder and uploaded
3. **Terraform** - infrastructure as code provisioning
4. **Red Hat Hybrid Cloud Console** - centralized management

## Step 2 - Launch a RHEL 9 Instance

Create a Terraform configuration:

```hcl
terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
    }
  }
}

variable "project_id" {
  type = string
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
  zone    = "us-central1-a"
}

resource "google_compute_instance" "rhel9" {
  name         = "my-rhel-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "projects/rhel-cloud/global/images/family/rhel-9"
    }
  }

  network_interface {
    network = "default"

    access_config {
    }
  }

  metadata = {
    "user-data" = file("cloud-config.yaml")
  }
}
```

## Step 3 - Configure cloud-init

RHEL 9 cloud images use cloud-init for first-boot customization. Create a `cloud-config.yaml` user-data file:

```yaml
#cloud-config
hostname: my-rhel-server
users:
  - default
  - name: admin
    groups: wheel
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    ssh_authorized_keys:
      - ssh-rsa AAAA...your-key-here
packages:
  - vim
  - tmux
```

## Step 4 - Register with Red Hat

For bring-your-own-subscription images, register the system with Red Hat:

```bash
sudo subscription-manager register --auto-attach
# Or connect to Red Hat Insights:

sudo insights-client --register
```

## Step 5 - Configure Security and Networking

Set up Google Cloud firewall rules to allow only necessary traffic. Enable SELinux (it is on by default) and configure firewalld.

## Step 6 - Set Up Monitoring

Connect your cloud instances to your monitoring infrastructure:

```bash
# Install Node Exporter for Prometheus
# Or register with Red Hat Insights
sudo insights-client
```

## Summary

You have learned how to use terraform to provision rhel 9 vms on gcp. RHEL 9 on cloud platforms benefits from official support, pre-configured images, and integration with Red Hat management tools.
