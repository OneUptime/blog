# How to Create GCP Secret Manager Secrets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Secret Manager, Security, Infrastructure as Code

Description: Learn how to create GCP Secret Manager secrets with OpenTofu for secure, version-controlled secret storage with fine-grained IAM access control.

GCP Secret Manager provides managed secret storage with version history, automatic replication, and audit logging. Managing secrets in OpenTofu ensures consistent access policies and secret configuration across projects.

## Provider Configuration

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}
```

## Creating a Secret

```hcl
resource "google_secret_manager_secret" "db_password" {
  secret_id = "production-db-password"
  project   = var.project_id

  # Automatic replication across regions
  replication {
    auto {}
  }

  labels = {
    environment = "production"
    service     = "database"
  }

  # Automatic destruction of disabled secret versions after 30 days
  version_destroy_ttl = "2592000s"  # 30 days
}

# Create the first version (actual secret value)

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password  # Pass via TF_VAR or separate secrets pipeline

  lifecycle {
    ignore_changes = [secret_data]  # Allow out-of-band rotation
  }
}
```

## Manual Replication (Specific Regions)

```hcl
resource "google_secret_manager_secret" "api_key" {
  secret_id = "stripe-api-key"

  replication {
    user_managed {
      replicas {
        location = "us-central1"

        customer_managed_encryption {
          kms_key_name = google_kms_crypto_key.secrets.id
        }
      }

      replicas {
        location = "us-east1"

        customer_managed_encryption {
          kms_key_name = google_kms_crypto_key.secrets_east.id
        }
      }
    }
  }
}
```

## IAM Access Binding

```hcl
# Allow Cloud Run service account to access the secret
resource "google_secret_manager_secret_iam_binding" "db_password_reader" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"

  members = [
    "serviceAccount:${google_service_account.app.email}",
    "serviceAccount:${google_service_account.worker.email}",
  ]
}

# Allow DevOps team to manage secrets
resource "google_secret_manager_secret_iam_member" "devops_admin" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.admin"
  member    = "group:devops@example.com"
}
```

## Multiple Secrets with for_each

```hcl
locals {
  app_secrets = toset([
    "database-password",
    "redis-auth-token",
    "stripe-api-key",
    "sendgrid-api-key",
    "jwt-signing-key",
  ])
}

resource "google_secret_manager_secret" "app_secrets" {
  for_each  = local.app_secrets
  secret_id = each.key

  replication {
    auto {}
  }

  labels = {
    application = "myapp"
    environment = "production"
  }
}

# Grant app access to all secrets
resource "google_secret_manager_secret_iam_binding" "app_access" {
  for_each  = local.app_secrets
  project   = var.project_id
  secret_id = google_secret_manager_secret.app_secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"

  members = [
    "serviceAccount:${google_service_account.app.email}",
  ]
}
```

## Accessing Secrets in Cloud Run

```hcl
resource "google_cloud_run_v2_service" "app" {
  name     = "myapp"
  location = "us-central1"

  template {
    service_account = google_service_account.app.email

    containers {
      image = "gcr.io/${var.project_id}/myapp:latest"

      # Mount secret as environment variable
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
    }
  }
}
```

## Conclusion

GCP Secret Manager in OpenTofu provides version-tracked, auditable secret storage with granular IAM access. Use automatic replication for simplicity or user-managed replication for data residency requirements. Always use lifecycle ignore_changes on secret versions to allow out-of-band rotation without OpenTofu reverting values. Reference secrets directly in Cloud Run environment variable configurations for seamless injection at runtime.
