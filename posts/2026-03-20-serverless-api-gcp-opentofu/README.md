# How to Build a Serverless API Backend with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Serverless, Cloud Run, Cloud Function, OpenTofu, Firestore, API Gateway

Description: Learn how to build a serverless API backend on GCP using OpenTofu with Cloud Run, Firebase API Gateway, Firestore, and IAP for authentication.

## Overview

A serverless API on GCP combines Cloud Run for containerized API services, Firestore for document storage, and API Gateway for routing. OpenTofu provisions the stack with IAM security and Secret Manager for credentials.

## Step 1: Cloud Run Service

```hcl
# main.tf - Cloud Run serverless API

resource "google_cloud_run_v2_service" "api" {
  name     = "serverless-api"
  location = "us-central1"

  template {
    scaling {
      min_instance_count = 0  # Scale to zero
      max_instance_count = 100
    }

    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/api/serverless-api:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      env {
        name = "DB_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_secret.secret_id
            version = "latest"
          }
        }
      }
    }

    service_account = google_service_account.api.email
  }

  # API Gateway calls the run.app URL; Cloud Run IAM controls invocation.
  ingress = "INGRESS_TRAFFIC_ALL"
}

# Allow Cloud Run to read secrets
resource "google_secret_manager_secret_iam_member" "api_read_secret" {
  secret_id = google_secret_manager_secret.db_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}
```

## Step 2: Firestore for Serverless Data

```hcl
# Firestore database in native mode
resource "google_firestore_database" "api" {
  name     = "(default)"
  location_id = "us-central1"
  type     = "FIRESTORE_NATIVE"

  concurrency_mode                  = "OPTIMISTIC"
  app_engine_integration_mode       = "DISABLED"
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"
  delete_protection_state           = "DELETE_PROTECTION_ENABLED"
}

# Composite index for query optimization
resource "google_firestore_index" "user_items" {
  collection = "items"
  database   = google_firestore_database.api.name

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# Grant API service account Firestore access
resource "google_project_iam_member" "api_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.api.email}"
}
```

## Step 3: API Gateway

```hcl
# API Gateway fronting Cloud Run
resource "google_api_gateway_api" "api" {
  provider = google-beta
  api_id   = "serverless-api"
}

resource "google_api_gateway_api_config" "api_config" {
  provider      = google-beta
  api           = google_api_gateway_api.api.api_id
  api_config_id = "v1"

  openapi_documents {
    document {
      path     = "openapi.yaml"
      contents = base64encode(templatefile("${path.module}/openapi.yaml", {
        cloud_run_url = google_cloud_run_v2_service.api.uri
      }))
    }
  }

  gateway_config {
    backend_config {
      google_service_account = google_service_account.api_gateway.email
    }
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.api_gateway_invoke
  ]
}

resource "google_api_gateway_gateway" "api" {
  provider   = google-beta
  api_config = google_api_gateway_api_config.api_config.id
  gateway_id = "serverless-gateway"
  region     = "us-central1"
}

# Allow API Gateway to invoke Cloud Run
resource "google_cloud_run_v2_service_iam_member" "api_gateway_invoke" {
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.api_gateway.email}"
}
```

## Summary

A serverless API on GCP built with OpenTofu scales to zero during idle periods with Cloud Run, and Firestore's native mode provides document storage with automatic scaling. API Gateway provides OpenAPI-based routing, while Cloud Run IAM restricts backend invocation to the gateway service account. Secret Manager stores credentials securely and Cloud Run service accounts access secrets with minimal IAM permissions.
