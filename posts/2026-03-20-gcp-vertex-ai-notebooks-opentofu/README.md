# How to Create GCP Vertex AI Notebooks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Vertex AI, Notebook, Machine Learning, Infrastructure as Code

Description: Learn how to create GCP Vertex AI Workbench managed notebooks and user-managed notebook instances for ML development using OpenTofu.

## Introduction

Vertex AI Workbench provides Jupyter-based notebook environments for ML development on GCP. Managed notebooks and user-managed notebooks were deprecated on April 14, 2025, so new deployments should use Vertex AI Workbench instances instead. OpenTofu manages these instances as code.

## Enabling APIs

```hcl
resource "google_project_service" "notebooks" {
  project = var.project_id
  service = "notebooks.googleapis.com"
}

resource "google_project_service" "aiplatform" {
  project = var.project_id
  service = "aiplatform.googleapis.com" # enable if the notebook will use Vertex AI APIs
}
```

## Vertex AI Workbench Instance

```hcl
resource "google_workbench_instance" "workbench" {
  name     = "${var.app_name}-workbench-${var.environment}"
  project  = var.project_id
  location = "${var.region}-a"  # Workbench instances are zonal resources

  gce_setup {
    machine_type      = "e2-standard-4"
    disable_public_ip = true

    vm_image {
      project = "cloud-notebooks-managed"
      family  = "workbench-instances"
    }

    service_accounts {
      email = google_service_account.notebooks.email
    }

    network_interfaces {
      network = google_compute_network.main.id
      subnet  = google_compute_subnetwork.private.id
    }

    metadata = {
      notebook-disable-root = "true"
    }
  }

  disable_proxy_access = false  # allow JupyterLab proxy access

  labels = {
    environment = var.environment
    managed_by  = "opentofu"
  }

  depends_on = [
    google_project_service.notebooks
  ]
}
```

## Service Account for Notebooks

```hcl
resource "google_service_account" "notebooks" {
  account_id   = "${var.app_name}-notebooks-sa"
  display_name = "Vertex AI Notebooks SA"
  project      = var.project_id
}

resource "google_project_iam_member" "notebooks_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.notebooks.email}"
}

resource "google_project_iam_member" "notebooks_aiplatform" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.notebooks.email}"
}
```

If you use service account access mode, users who need to open JupyterLab must also have `roles/iam.serviceAccountUser` on this service account.

## Vertex AI Workbench Instance with a Container Image

```hcl
resource "google_workbench_instance" "container_workbench" {
  name     = "${var.app_name}-container-nb-${var.environment}"
  project  = var.project_id
  location = "${var.region}-b"

  gce_setup {
    machine_type      = "e2-standard-4"
    disable_public_ip = true

    container_image {
      repository = "us-docker.pkg.dev/deeplearning-platform-release/gcr.io/workbench-container"
      tag        = "latest"
    }

    service_accounts {
      email = google_service_account.notebooks.email
    }

    network_interfaces {
      network = google_compute_network.main.id
      subnet  = google_compute_subnetwork.private.id
    }

    metadata = {
      post-startup-script = "gs://${var.setup_bucket}/scripts/notebook_setup.sh"
    }
  }

  disable_proxy_access = false

  depends_on = [
    google_project_service.notebooks
  ]
}
```

## Outputs

```hcl
output "notebook_proxy_uri" {
  description = "JupyterLab access URL"
  value       = google_workbench_instance.workbench.proxy_uri
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Vertex AI Workbench instances provide Jupyter environments optimized for ML workflows on GCP. OpenTofu manages the Workbench instance, service account permissions, network settings, and startup configuration as code, creating a consistent and reproducible data science environment.
