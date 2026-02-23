# How to Import Existing GCP Resources into Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Google Cloud, Import, Infrastructure as Code, Migration

Description: Learn how to import existing Google Cloud Platform resources into Terraform including Compute Engine instances, GCS buckets, Cloud SQL, VPCs, and IAM bindings.

---

Google Cloud Platform resources created through the console, gcloud CLI, or Deployment Manager can be imported into Terraform state for ongoing management. GCP resources use various identifier formats depending on the resource type, including project-based paths, self-links, and composite identifiers. Understanding these formats is key to successful imports.

In this guide, we will walk through importing common GCP resources into Terraform including Compute Engine instances, Cloud Storage buckets, Cloud SQL databases, VPC networks, and IAM bindings.

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.5.0"
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
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}
```

## Importing Compute Engine Instances

```hcl
resource "google_compute_instance" "app" {
  name         = "app-server"
  machine_type = "e2-standard-4"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
    }
  }

  network_interface {
    network    = "default"
    access_config {}
  }
}

# GCP import format: projects/{project}/zones/{zone}/instances/{name}
import {
  to = google_compute_instance.app
  id = "projects/${var.project_id}/zones/us-central1-a/instances/app-server"
}
```

## Importing Cloud Storage Buckets

```hcl
resource "google_storage_bucket" "data" {
  name          = "${var.project_id}-data-bucket"
  location      = "US"
  force_destroy = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 365
    }
  }
}

# GCS bucket import uses just the bucket name
import {
  to = google_storage_bucket.data
  id = "${var.project_id}-data-bucket"
}
```

## Importing VPC Networks

```hcl
resource "google_compute_network" "main" {
  name                    = "main-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "app" {
  name          = "app-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

import {
  to = google_compute_network.main
  id = "projects/${var.project_id}/global/networks/main-vpc"
}

import {
  to = google_compute_subnetwork.app
  id = "projects/${var.project_id}/regions/${var.region}/subnetworks/app-subnet"
}
```

## Importing Cloud SQL Databases

```hcl
resource "google_sql_database_instance" "main" {
  name             = "production-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-custom-4-16384"

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "app" {
  name     = "appdb"
  instance = google_sql_database_instance.main.name
}

import {
  to = google_sql_database_instance.main
  id = "projects/${var.project_id}/instances/production-db"
}

import {
  to = google_sql_database.app
  id = "projects/${var.project_id}/instances/production-db/databases/appdb"
}
```

## Importing GKE Clusters

```hcl
resource "google_container_cluster" "primary" {
  name     = "production-cluster"
  location = var.region

  initial_node_count = 1
  remove_default_node_pool = true
}

import {
  to = google_container_cluster.primary
  id = "projects/${var.project_id}/locations/${var.region}/clusters/production-cluster"
}
```

## Importing IAM Bindings

```hcl
resource "google_project_iam_member" "editor" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:app-sa@${var.project_id}.iam.gserviceaccount.com"
}

# IAM member import format: {project} {role} {member}
import {
  to = google_project_iam_member.editor
  id = "${var.project_id} roles/editor serviceAccount:app-sa@${var.project_id}.iam.gserviceaccount.com"
}
```

## Importing Firewall Rules

```hcl
resource "google_compute_firewall" "web" {
  name    = "allow-web"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
}

import {
  to = google_compute_firewall.web
  id = "projects/${var.project_id}/global/firewalls/allow-web"
}
```

## Finding GCP Resource IDs

```bash
# List compute instances
gcloud compute instances list --format="table(name,zone,selfLink)"

# List storage buckets
gcloud storage ls

# List VPC networks
gcloud compute networks list --format="table(name,selfLink)"

# List Cloud SQL instances
gcloud sql instances list --format="table(name,region,selfLink)"

# List GKE clusters
gcloud container clusters list --format="table(name,location)"
```

## Conclusion

Importing GCP resources into Terraform follows the same general workflow as other cloud providers but uses GCP-specific resource identifiers. Most GCP resources use the `projects/{project}/...` path format, which you can find using gcloud commands or the Cloud Console. For other cloud imports, see [AWS imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-aws-resources-into-terraform/view) and [Azure imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-azure-resources-into-terraform/view). For advanced import features, check out [the import block](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-import-block-in-terraform-1-5-plus/view).
