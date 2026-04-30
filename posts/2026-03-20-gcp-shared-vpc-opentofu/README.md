# How to Create GCP Shared VPC with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Shared VPC, Networking, OpenTofu, Organization, Infrastructure

Description: Learn how to configure GCP Shared VPC with OpenTofu to allow multiple service projects to share a central VPC network managed by a host project.

## Overview

GCP Shared VPC allows organizations to connect multiple service projects to a central host project VPC. Service projects share the host project's network resources while maintaining project-level resource isolation. This simplifies network management in large organizations.

## Step 1: Enable Shared VPC on Host Project

```hcl
# main.tf - Enable Shared VPC on the host project

resource "google_compute_shared_vpc_host_project" "host" {
  project = var.host_project_id
}
```

## Step 2: Attach Service Projects to Host

```hcl
# Attach service projects to the Shared VPC host
resource "google_compute_shared_vpc_service_project" "service_project_1" {
  host_project    = var.host_project_id
  service_project = var.service_project_1_id

  depends_on = [google_compute_shared_vpc_host_project.host]
}

resource "google_compute_shared_vpc_service_project" "service_project_2" {
  host_project    = var.host_project_id
  service_project = var.service_project_2_id

  depends_on = [google_compute_shared_vpc_host_project.host]
}
```

## Step 3: Create Shared VPC Network in Host Project

```hcl
# VPC network in the host project
resource "google_compute_network" "shared_vpc" {
  project                 = var.host_project_id
  name                    = "shared-vpc-network"
  auto_create_subnetworks = false
}

# Subnets with secondary ranges for GKE
resource "google_compute_subnetwork" "app_subnet" {
  project       = var.host_project_id
  name          = "app-subnet"
  network       = google_compute_network.shared_vpc.self_link
  region        = "us-central1"
  ip_cidr_range = "10.0.1.0/24"

  # Secondary ranges for GKE pods and services
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }
}
```

## Step 4: Grant IAM Access to Shared Subnet

```hcl
# Grant the IAM principal that will create resources in service project 1
# access to the shared subnet
# Example: serviceAccount:deployer@service-project-1.iam.gserviceaccount.com
resource "google_compute_subnetwork_iam_member" "service_project_1_access" {
  project    = var.host_project_id
  region     = "us-central1"
  subnetwork = google_compute_subnetwork.app_subnet.name
  role       = "roles/compute.networkUser"
  member     = var.service_project_1_admin_member
}

# If you also use GKE in the service project, grant the GKE service agent
# access to the subnet. If the service project was attached without enabling
# GKE access, also grant roles/container.hostServiceAgentUser on the host project.
resource "google_compute_subnetwork_iam_member" "gke_access" {
  project    = var.host_project_id
  region     = "us-central1"
  subnetwork = google_compute_subnetwork.app_subnet.name
  role       = "roles/compute.networkUser"
  member     = "serviceAccount:service-${var.service_project_1_number}@container-engine-robot.iam.gserviceaccount.com"
}
```

## Step 5: Create VM in Service Project Using Shared Subnet

```hcl
# VM in service project using the shared subnet
resource "google_compute_instance" "service_vm" {
  project      = var.service_project_1_id
  name         = "service-project-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  depends_on = [
    google_compute_shared_vpc_service_project.service_project_1,
    google_compute_subnetwork_iam_member.service_project_1_access,
  ]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    # Reference the subnet in the host project
    subnetwork         = google_compute_subnetwork.app_subnet.self_link
    subnetwork_project = var.host_project_id
  }
}
```

## Summary

GCP Shared VPC with OpenTofu centralizes network management in a host project while allowing service projects to deploy resources into shared subnets. This pattern works well for large organizations where a central networking team manages IP allocation and firewall rules across multiple application teams.
