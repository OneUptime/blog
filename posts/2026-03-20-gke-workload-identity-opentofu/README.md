# How to Set Up GKE Workload Identity with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Workload Identity, GCP, OpenTofu, Security, IAM

Description: Learn how to configure GKE Workload Identity with OpenTofu to enable pods to authenticate with GCP services without service account key files.

## Overview

GKE Workload Identity Federation for GKE lets Kubernetes workloads authenticate to Google Cloud using federated Kubernetes service account identities. In this example, the Kubernetes service account is linked to a Google Cloud service account so pods can obtain short-lived credentials through the GKE metadata server instead of using mounted key files.

## Step 1: Enable Workload Identity on the Cluster

```hcl
# main.tf - Enable Workload Identity on GKE cluster

resource "google_container_cluster" "cluster" {
  name     = "workload-identity-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  # Workload Identity configuration
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name
}

# Node pool must also have GKE_METADATA enabled
resource "google_container_node_pool" "nodes" {
  name    = "default-pool"
  cluster = google_container_cluster.cluster.name
  location = "us-central1"

  node_config {
    machine_type = "e2-medium"

    # Required: use GKE Metadata server instead of VM metadata
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
```

## Step 2: Create GCP Service Account

```hcl
# Required for the IAM service account impersonation flow used in this example
resource "google_project_service" "iamcredentials_api" {
  project = var.project_id
  service = "iamcredentials.googleapis.com"
}

# GCP service account that pods will impersonate
resource "google_service_account" "app_sa" {
  account_id   = "k8s-app-service-account"
  display_name = "GKE Application Service Account"
  project      = var.project_id
}

# Grant permissions to the service account
resource "google_project_iam_member" "app_sa_storage_reader" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.app_sa.email}"
}
```

## Step 3: Bind Kubernetes Service Account to GCP Service Account

```hcl
# Allow the Kubernetes service account to impersonate the GCP service account
resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.app_sa.name
  role               = "roles/iam.workloadIdentityUser"
  # Binding format: PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/my-app-ksa]"
}
```

## Step 4: Create the Kubernetes Service Account

```hcl
# Create the annotated Kubernetes service account
resource "kubernetes_service_account" "app_ksa" {
  metadata {
    name      = "my-app-ksa"
    namespace = "default"

    # This annotation links the KSA to the GCP SA
    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.app_sa.email
    }
  }
}
```

## Step 5: Outputs

```hcl
output "workload_identity_pool" {
  value = "${var.project_id}.svc.id.goog"
}

output "gcp_service_account_email" {
  value = google_service_account.app_sa.email
}
```

## Summary

GKE Workload Identity with OpenTofu eliminates the need for service account key files in Kubernetes. In the service account impersonation pattern shown here, a Kubernetes service account is linked to a Google Cloud service account via IAM, and pods receive short-lived credentials from the GKE metadata server instead of long-lived keys.
