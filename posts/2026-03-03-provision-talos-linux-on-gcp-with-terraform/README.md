# How to Provision Talos Linux on GCP with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GCP, Terraform, Kubernetes, Google Cloud

Description: Step-by-step guide to deploying Talos Linux Kubernetes clusters on Google Cloud Platform using Terraform for automated provisioning.

---

Google Cloud Platform offers excellent networking, competitive pricing, and tight integration with open-source tooling. Running Talos Linux on GCP gives you an immutable, API-managed Kubernetes OS on top of Google's infrastructure. When you bring Terraform into the picture, the entire deployment becomes reproducible and version-controlled. This guide walks through provisioning a Talos Linux cluster on GCP with Terraform from scratch.

## Why GCP for Talos Linux?

GCP stands out for its network performance and its native load balancing capabilities. The global VPC model means you do not need to deal with VPC peering across regions the same way you do on other clouds. Google's Compute Engine instances boot quickly, which pairs well with Talos Linux's fast startup times.

While GKE is the managed Kubernetes offering on GCP, running Talos gives you control over every aspect of the cluster. You pick the Kubernetes version, you control the OS configuration, and you own the upgrade process. For teams with strict compliance needs or custom requirements, this level of control is worth the extra effort.

## Prerequisites

You will need these tools installed:

- Terraform 1.5 or later
- Google Cloud SDK (`gcloud`) authenticated with a project
- `talosctl` CLI
- A GCP project with billing enabled and the Compute Engine API activated

You will also need the Talos Linux image uploaded to GCP or available as a public image. Sidero Labs provides instructions for importing the Talos image into your GCP project.

## Importing the Talos Image

Before writing any Terraform, import the Talos Linux image into your GCP project:

```bash
# Download the Talos GCP image
wget https://github.com/siderolabs/talos/releases/download/v1.7.0/gcp-amd64.tar.gz

# Create a GCS bucket for the image
gsutil mb gs://talos-images-${PROJECT_ID}

# Upload the image
gsutil cp gcp-amd64.tar.gz gs://talos-images-${PROJECT_ID}/

# Create the compute image from the uploaded file
gcloud compute images create talos-v1-7-0 \
  --source-uri=gs://talos-images-${PROJECT_ID}/gcp-amd64.tar.gz \
  --guest-os-features=VIRTIO_SCSI_MULTIQUEUE
```

## Terraform Variables

Define the variables for your deployment:

```hcl
# variables.tf - Input variables for GCP Talos deployment

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "cluster_name" {
  description = "Name of the Talos cluster"
  type        = string
  default     = "talos-cluster"
}

variable "control_plane_count" {
  description = "Number of control plane nodes"
  type        = number
  default     = 3
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

variable "control_plane_machine_type" {
  description = "Machine type for control plane nodes"
  type        = string
  default     = "e2-standard-4"
}

variable "worker_machine_type" {
  description = "Machine type for worker nodes"
  type        = string
  default     = "e2-standard-2"
}

variable "talos_image" {
  description = "Self-link to the Talos Linux image"
  type        = string
}
```

## Provider and Network Configuration

```hcl
# main.tf - GCP provider and networking

provider "google" {
  project = var.project_id
  region  = var.region
}

# VPC network for the cluster
resource "google_compute_network" "talos" {
  name                    = "${var.cluster_name}-network"
  auto_create_subnetworks = false
}

# Subnet for cluster nodes
resource "google_compute_subnetwork" "talos" {
  name          = "${var.cluster_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.talos.id
}

# Firewall rule for internal cluster communication
resource "google_compute_firewall" "internal" {
  name    = "${var.cluster_name}-internal"
  network = google_compute_network.talos.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/24"]
}

# Firewall rule for external access to Talos and Kubernetes APIs
resource "google_compute_firewall" "external" {
  name    = "${var.cluster_name}-external"
  network = google_compute_network.talos.name

  allow {
    protocol = "tcp"
    ports    = ["6443", "50000"]
  }

  source_ranges = ["0.0.0.0/0"]
}
```

## Creating Compute Instances

Provision the control plane and worker instances:

```hcl
# Control plane instances
resource "google_compute_instance" "control_plane" {
  count        = var.control_plane_count
  name         = "${var.cluster_name}-cp-${count.index}"
  machine_type = var.control_plane_machine_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = var.talos_image
      size  = 50
      type  = "pd-ssd"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.talos.id

    # Assign an external IP for management access
    access_config {}
  }

  tags = ["talos-cp"]

  labels = {
    role = "controlplane"
  }
}

# Worker instances
resource "google_compute_instance" "worker" {
  count        = var.worker_count
  name         = "${var.cluster_name}-worker-${count.index}"
  machine_type = var.worker_machine_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = var.talos_image
      size  = 100
      type  = "pd-ssd"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.talos.id
    access_config {}
  }

  tags = ["talos-worker"]

  labels = {
    role = "worker"
  }
}
```

## Setting Up the Load Balancer

Create a TCP load balancer for the Kubernetes API:

```hcl
# Health check for the Kubernetes API
resource "google_compute_health_check" "k8s_api" {
  name = "${var.cluster_name}-k8s-api-health"

  tcp_health_check {
    port = 6443
  }
}

# Instance group for control plane nodes
resource "google_compute_instance_group" "cp" {
  name      = "${var.cluster_name}-cp-group"
  zone      = var.zone
  instances = google_compute_instance.control_plane[*].self_link
}

# Backend service
resource "google_compute_region_backend_service" "k8s_api" {
  name                  = "${var.cluster_name}-k8s-api-backend"
  region                = var.region
  protocol              = "TCP"
  load_balancing_scheme = "EXTERNAL"
  health_checks         = [google_compute_health_check.k8s_api.id]

  backend {
    group = google_compute_instance_group.cp.id
  }
}

# Forwarding rule
resource "google_compute_forwarding_rule" "k8s_api" {
  name                  = "${var.cluster_name}-k8s-api-fwd"
  region                = var.region
  load_balancing_scheme = "EXTERNAL"
  port_range            = "6443"
  backend_service       = google_compute_region_backend_service.k8s_api.id
}
```

## Bootstrapping and Configuration

After Terraform provisions the infrastructure, generate Talos configs and bootstrap:

```bash
# Generate the cluster secrets
talosctl gen secrets -o secrets.yaml

# Generate machine configurations with the LB IP as the endpoint
talosctl gen config talos-cluster https://<LB_IP>:6443 \
  --with-secrets secrets.yaml

# Apply configs to each node
talosctl apply-config --insecure --nodes <CP_IP> --file controlplane.yaml
talosctl apply-config --insecure --nodes <WORKER_IP> --file worker.yaml

# Bootstrap the cluster
talosctl bootstrap --nodes <FIRST_CP_IP> --endpoints <FIRST_CP_IP>

# Get kubeconfig
talosctl kubeconfig --nodes <FIRST_CP_IP>
```

## Outputs

```hcl
# outputs.tf

output "control_plane_external_ips" {
  value = google_compute_instance.control_plane[*].network_interface[0].access_config[0].nat_ip
}

output "worker_external_ips" {
  value = google_compute_instance.worker[*].network_interface[0].access_config[0].nat_ip
}

output "load_balancer_ip" {
  value = google_compute_forwarding_rule.k8s_api.ip_address
}
```

## Production Tips

For production, spread your instances across multiple zones using a managed instance group or by creating instances in different zones. Use a remote backend like GCS for your Terraform state. Enable shielded VM features for additional security, and use VPC Service Controls if you need to restrict API access to specific networks.

Talos on GCP with Terraform gives you a clean, automated path to running Kubernetes with an OS that was designed specifically for the job. The immutable nature of Talos means fewer surprises in production and a smaller attack surface for your infrastructure.
