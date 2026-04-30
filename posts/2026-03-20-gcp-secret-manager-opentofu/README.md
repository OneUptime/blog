# How to Use GCP Secret Manager with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Secret Manager, Security, Infrastructure as Code, Google Cloud

Description: Learn how to create, version, and retrieve secrets from GCP Secret Manager within OpenTofu configurations to keep credentials out of your code.

## Introduction

GCP Secret Manager stores sensitive data as versioned secrets and controls access via Cloud IAM. OpenTofu can read secret values with the `google_secret_manager_secret_version_access` data source, which it reads during planning when possible and defers to apply only when needed, so you don't need to hardcode credentials in your configuration files.

## Enabling the API and Configuring the Provider

```hcl
# versions.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}

# Enable the Secret Manager API
resource "google_project_service" "secretmanager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# Enable the Pub/Sub API for rotation notifications
resource "google_project_service" "pubsub" {
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}
```

## Creating a Secret

```hcl
# Create the secret resource (a named container for versions)
resource "google_secret_manager_secret" "db_password" {
  secret_id = "prod-db-password"
  project   = var.project_id

  replication {
    auto {}   # GCP manages replication across regions
  }

  depends_on = [google_project_service.secretmanager]
}

# Add the initial secret version
resource "google_secret_manager_secret_version" "db_password_v1" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password   # Passed via TF_VAR_db_password
}
```

## Reading a Secret from Secret Manager

```hcl
# Fetch the latest version of a secret
data "google_secret_manager_secret_version_access" "db_password" {
  secret  = "prod-db-password"
  project = var.project_id
}

# Use the secret value in a resource
resource "google_sql_database_instance" "main" {
  name             = "prod-postgres"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-g1-small"
  }
}

resource "google_sql_user" "app" {
  name     = "app"
  instance = google_sql_database_instance.main.name
  # Inject the secret value - never hardcoded
  password = data.google_secret_manager_secret_version_access.db_password.secret_data
}
```

## Granting a Service Account Access to a Secret

```hcl
# Allow a Google service account to read the secret
resource "google_secret_manager_secret_iam_member" "app_read" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:app-sa@${var.project_id}.iam.gserviceaccount.com"
}
```

## Automatic Secret Rotation Notification

GCP Secret Manager publishes Pub/Sub messages for rotation events. Set up notification topics to trigger a rotation workflow such as Cloud Functions:

```hcl
data "google_project" "current" {
  project_id = var.project_id
}

resource "google_pubsub_topic" "secret_rotation" {
  name    = "secret-rotation-notifications"
  project = var.project_id

  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_topic_iam_member" "secret_rotation_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.secret_rotation.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-secretmanager.iam.gserviceaccount.com"
}

resource "google_secret_manager_secret" "api_key" {
  secret_id = "prod-api-key"
  project   = var.project_id

  replication { auto {} }

  # Notify when the secret should be rotated
  rotation {
    next_rotation_time = "2026-12-31T00:00:00Z"
    rotation_period    = "2592000s"   # 30 days
  }

  topics {
    name = google_pubsub_topic.secret_rotation.id
  }

  depends_on = [
    google_project_service.secretmanager,
    google_pubsub_topic_iam_member.secret_rotation_publisher,
  ]
}
```

## Conclusion

GCP Secret Manager integrates cleanly with OpenTofu through data sources that read secrets from Secret Manager. By using IAM bindings for fine-grained access control and Pub/Sub notifications for rotation events, teams can manage application secrets securely without hardcoding credentials anywhere in their infrastructure code.
