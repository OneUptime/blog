# How to Set Up GKE Config Connector with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Config Connector, Kubernetes, OpenTofu, GCP, Infrastructure as Code

Description: Learn how to install and configure GKE Config Connector with OpenTofu to manage GCP resources using Kubernetes custom resources alongside OpenTofu-managed infrastructure.

## Overview

Config Connector is available as a GKE add-on that lets you manage GCP resources through Kubernetes Custom Resource Definitions (CRDs). It bridges Kubernetes and GCP, allowing teams to declare GCP resources in YAML manifests alongside their Kubernetes workloads.

## Step 1: Enable Config Connector on GKE Cluster

```hcl
# main.tf - Enable Config Connector add-on on GKE

resource "google_container_cluster" "config_connector_cluster" {
  name     = "config-connector-cluster"
  location = "us-central1"

  initial_node_count = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # Workload Identity is required for Config Connector
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Config Connector requires Kubernetes Engine Monitoring
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
  }

  # Enable Config Connector add-on
  addons_config {
    config_connector_config {
      enabled = true
    }
  }
}
```

## Step 2: Create Service Account for Config Connector

```hcl
# GCP service account that Config Connector uses
resource "google_service_account" "config_connector_sa" {
  account_id   = "config-connector-sa"
  display_name = "Config Connector Service Account"
}

# Grant Config Connector SA editor role (adjust based on resources it manages)
resource "google_project_iam_member" "config_connector_editor" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.config_connector_sa.email}"
}

# Allow Config Connector to publish metrics from the namespace-scoped controller
resource "google_project_iam_member" "config_connector_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.config_connector_sa.email}"
}

# Bind Config Connector's namespace-scoped Kubernetes SA to the GCP SA
resource "google_service_account_iam_member" "config_connector_workload_identity" {
  service_account_id = google_service_account.config_connector_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[cnrm-system/cnrm-controller-manager-app-namespace]"
}
```

## Step 3: Configure ConfigConnectorContext

```hcl
resource "kubernetes_namespace_v1" "app_namespace" {
  metadata {
    name = "app-namespace"
    annotations = {
      "cnrm.cloud.google.com/project-id" = var.project_id
    }
  }
}

# Namespace-level Config Connector configuration
resource "kubernetes_manifest" "config_connector_context" {
  depends_on = [
    kubernetes_namespace_v1.app_namespace,
    google_project_iam_member.config_connector_editor,
    google_project_iam_member.config_connector_metric_writer,
    google_service_account_iam_member.config_connector_workload_identity,
  ]

  manifest = {
    apiVersion = "core.cnrm.cloud.google.com/v1beta1"
    kind       = "ConfigConnectorContext"
    metadata = {
      name      = "configconnectorcontext.core.cnrm.cloud.google.com"
      namespace = "app-namespace"
    }
    spec = {
      googleServiceAccount = google_service_account.config_connector_sa.email
      stateIntoSpec        = "Absent"
    }
  }
}
```

## Step 4: Use Config Connector to Create GCP Resources

```hcl
# Create a Cloud SQL instance via Config Connector CRD (managed by Kubernetes)
resource "kubernetes_manifest" "sql_instance" {
  depends_on = [kubernetes_manifest.config_connector_context]

  manifest = {
    apiVersion = "sql.cnrm.cloud.google.com/v1beta1"
    kind       = "SQLInstance"
    metadata = {
      name      = "my-sql-instance"
      namespace = "app-namespace"
    }
    spec = {
      region          = "us-central1"
      databaseVersion = "POSTGRES_15"
      settings = {
        tier = "db-custom-2-8192"
        backupConfiguration = {
          enabled = true
        }
      }
    }
  }
}
```

## Summary

GKE Config Connector with OpenTofu enables a GitOps-friendly approach to managing GCP resources through Kubernetes CRDs. Teams can declare GCP databases, storage, and services alongside their application YAML manifests. OpenTofu manages the cluster, IAM bindings, and Config Connector setup, while teams manage application-specific GCP resources through Kubernetes manifests.
