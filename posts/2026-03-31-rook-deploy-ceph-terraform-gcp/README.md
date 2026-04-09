# How to Deploy Ceph with Terraform on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Terraform, GCP, Kubernetes, Infrastructure as Code

Description: Use Terraform to provision a GKE cluster with Persistent Disk storage nodes on GCP and deploy Rook-Ceph for distributed block and object storage.

---

Google Cloud Platform's GKE and Persistent Disks provide a solid foundation for Rook-Ceph. Terraform makes the deployment reproducible and manageable as code. This guide covers the complete GCP + Terraform + Rook-Ceph stack.

## Project Structure

```text
ceph-gcp/
  main.tf
  gke.tf
  rook.tf
  variables.tf
  outputs.tf
  values/
    rook-cluster.yaml
```

## GCP Provider and VPC Setup

```hcl
# main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_compute_network" "ceph_vpc" {
  name                    = "ceph-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "ceph_subnet" {
  name          = "ceph-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.ceph_vpc.id

  secondary_ip_range {
    range_name    = "pod-range"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "service-range"
    ip_cidr_range = "10.2.0.0/16"
  }
}
```

## GKE Cluster with Storage Node Pool

```hcl
# gke.tf
resource "google_container_cluster" "ceph_cluster" {
  name     = var.cluster_name
  location = var.region

  network    = google_compute_network.ceph_vpc.name
  subnetwork = google_compute_subnetwork.ceph_subnet.name

  remove_default_node_pool = true
  initial_node_count       = 1

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "pod-range"
    services_secondary_range_name = "service-range"
  }
}

resource "google_container_node_pool" "ceph_storage_nodes" {
  name     = "ceph-storage"
  cluster  = google_container_cluster.ceph_cluster.name
  location = var.region

  node_count = var.osd_node_count

  node_config {
    machine_type = "n2-standard-8"
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    local_nvme_ssd_block_config {
      local_ssd_count = var.osds_per_node
    }

    labels = {
      role = "ceph-storage"
    }

    taint {
      key    = "dedicated"
      value  = "ceph"
      effect = "NO_SCHEDULE"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}
```

## Local NVMe SSD Storage for OSDs

On GKE, OSD storage is provisioned as local NVMe SSDs directly in the node pool configuration (via `local_nvme_ssd_block_config` in the storage node pool above). Each local NVMe SSD provides 375 GB of raw block storage. Rook-Ceph automatically discovers these devices and uses them for OSD provisioning without needing separate disk resources.

## Rook-Ceph Helm Deployment

```hcl
# rook.tf
data "google_client_config" "default" {}

provider "helm" {
  kubernetes {
    host                   = "https://${google_container_cluster.ceph_cluster.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(
      google_container_cluster.ceph_cluster.master_auth[0].cluster_ca_certificate
    )
  }
}

resource "helm_release" "rook_operator" {
  name             = "rook-ceph"
  repository       = "https://charts.rook.io/release"
  chart            = "rook-ceph"
  version          = "v1.13.0"
  namespace        = "rook-ceph"
  create_namespace = true

  depends_on = [google_container_node_pool.ceph_storage_nodes]
}

resource "helm_release" "rook_cluster" {
  name       = "rook-ceph-cluster"
  repository = "https://charts.rook.io/release"
  chart      = "rook-ceph-cluster"
  version    = "v1.13.0"
  namespace  = "rook-ceph"

  values = [file("${path.module}/values/rook-cluster.yaml")]

  depends_on = [helm_release.rook_operator]
}
```

## Variables and Outputs

```hcl
# variables.tf
variable "project_id" { type = string }
variable "region" { type = string; default = "us-central1" }
variable "cluster_name" { type = string; default = "rook-ceph-gcp" }
variable "osd_node_count" { type = number; default = 3 }
variable "osds_per_node" { type = number; default = 2 }

# outputs.tf
output "kubeconfig_command" {
  value = "gcloud container clusters get-credentials ${var.cluster_name} --region ${var.region} --project ${var.project_id}"
}
```

## Summary

Deploying Rook-Ceph on GCP with Terraform provisions a GKE cluster with dedicated storage nodes backed by SSD Persistent Disks. Terraform manages the full lifecycle from VPC creation to Helm chart installation, making the entire stack reproducible and easy to update or destroy as needed.
