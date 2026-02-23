# How to Use GCP Secret Manager with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Secret Manager, Security, IaC, DevOps

Description: A practical guide to using Google Cloud Secret Manager with Terraform, covering secret creation, version management, IAM bindings, automatic rotation, and integration with GKE and Cloud Run.

---

Google Cloud Secret Manager is a managed service for storing API keys, passwords, certificates, and other sensitive data. It integrates cleanly with Terraform, letting you create secrets, manage their versions, set up access controls, and reference them from your application infrastructure. This guide covers the practical patterns you need.

## Enabling the API

Before using Secret Manager, enable the API in your project:

```hcl
resource "google_project_service" "secretmanager" {
  service = "secretmanager.googleapis.com"
}
```

## Creating Secrets

Create a secret and add a version with its value:

```hcl
# Create the secret (metadata only - no value yet)
resource "google_secret_manager_secret" "database_password" {
  secret_id = "database-password"

  replication {
    auto {}
  }

  # Labels for organization
  labels = {
    environment = "production"
    service     = "myapp"
  }

  depends_on = [google_project_service.secretmanager]
}

# Add a version with the actual secret value
resource "google_secret_manager_secret_version" "database_password" {
  secret      = google_secret_manager_secret.database_password.id
  secret_data = random_password.database.result
}

# Generate the password
resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}
```

Store structured data as JSON:

```hcl
resource "google_secret_manager_secret" "db_connection" {
  secret_id = "database-connection-string"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_connection" {
  secret = google_secret_manager_secret.db_connection.id

  secret_data = jsonencode({
    host     = google_sql_database_instance.main.public_ip_address
    port     = 5432
    database = "myapp"
    username = "admin"
    password = random_password.database.result
    ssl      = true
  })
}
```

## Retrieving Secrets

Read existing secrets using data sources:

```hcl
# Reference an existing secret
data "google_secret_manager_secret" "api_key" {
  secret_id = "external-api-key"
}

# Get the latest secret version
data "google_secret_manager_secret_version" "api_key" {
  secret = "external-api-key"
}

# Get a specific version
data "google_secret_manager_secret_version" "api_key_v2" {
  secret  = "external-api-key"
  version = "2"
}

# Use the secret value
locals {
  api_key = data.google_secret_manager_secret_version.api_key.secret_data
}
```

## IAM Access Controls

Control who can access secrets using IAM bindings:

```hcl
# Grant a service account access to read a specific secret
resource "google_secret_manager_secret_iam_member" "app_access" {
  secret_id = google_secret_manager_secret.database_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}

# Grant access to read all secrets in the project
resource "google_project_iam_member" "secret_reader" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.app.email}"
}

# Conditional access - only from specific service accounts
resource "google_secret_manager_secret_iam_binding" "restricted" {
  secret_id = google_secret_manager_secret.database_password.id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${google_service_account.app.email}",
    "serviceAccount:${google_service_account.worker.email}"
  ]
}
```

Available roles:

- `roles/secretmanager.secretAccessor` - Read secret values
- `roles/secretmanager.viewer` - View secret metadata (not values)
- `roles/secretmanager.admin` - Full management access
- `roles/secretmanager.secretVersionManager` - Manage secret versions

## Integrating with Cloud Run

Pass secrets to Cloud Run services:

```hcl
resource "google_cloud_run_v2_service" "app" {
  name     = "myapp"
  location = "us-east1"

  template {
    service_account = google_service_account.app.email

    containers {
      image = "gcr.io/my-project/myapp:latest"

      # Mount as environment variables
      env {
        name = "DATABASE_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_password.id
            version = "latest"
          }
        }
      }

      env {
        name = "API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_key.id
            version = "latest"
          }
        }
      }

      # Mount as a file volume
      volume_mounts {
        name       = "tls-cert"
        mount_path = "/secrets/tls"
      }
    }

    volumes {
      name = "tls-cert"
      secret {
        secret = google_secret_manager_secret.tls_cert.id
        items {
          version = "latest"
          path    = "cert.pem"
        }
      }
    }
  }
}
```

## Integrating with GKE

Use the GCP Secret Manager add-on for GKE or the External Secrets Operator:

```hcl
# Enable the Secret Manager CSI driver on GKE
resource "google_container_cluster" "main" {
  name     = "myapp-cluster"
  location = "us-east1"

  # Enable Secret Manager add-on
  secret_manager_config {
    enabled = true
  }

  node_pool {
    name       = "default"
    node_count = 3

    node_config {
      machine_type = "e2-standard-4"

      service_account = google_service_account.gke_nodes.email
      oauth_scopes = [
        "https://www.googleapis.com/auth/cloud-platform"
      ]
    }
  }
}

# Grant GKE node service account access to secrets
resource "google_secret_manager_secret_iam_member" "gke_access" {
  secret_id = google_secret_manager_secret.database_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.gke_nodes.email}"
}
```

## Replication Configuration

Secret Manager supports different replication strategies:

```hcl
# Automatic replication (Google manages it)
resource "google_secret_manager_secret" "auto_replicated" {
  secret_id = "auto-replicated-secret"

  replication {
    auto {}
  }
}

# User-managed replication with specific regions
resource "google_secret_manager_secret" "regional" {
  secret_id = "regional-secret"

  replication {
    user_managed {
      replicas {
        location = "us-east1"

        # Optional: use a specific CMEK key
        customer_managed_encryption {
          kms_key_name = google_kms_crypto_key.secrets.id
        }
      }
      replicas {
        location = "us-west1"

        customer_managed_encryption {
          kms_key_name = google_kms_crypto_key.secrets_west.id
        }
      }
    }
  }
}
```

## Secret Rotation

Set up automatic rotation using Cloud Functions:

```hcl
# Rotation topic
resource "google_pubsub_topic" "secret_rotation" {
  name = "secret-rotation"
}

# Configure rotation on the secret
resource "google_secret_manager_secret" "rotating_password" {
  secret_id = "rotating-database-password"

  replication {
    auto {}
  }

  # Set rotation schedule
  rotation {
    rotation_period    = "2592000s"  # 30 days
    next_rotation_time = "2026-03-25T00:00:00Z"
  }

  # Publish to Pub/Sub when rotation is needed
  topics {
    name = google_pubsub_topic.secret_rotation.id
  }
}

# Cloud Function that handles rotation
resource "google_cloudfunctions2_function" "secret_rotator" {
  name     = "secret-rotator"
  location = "us-east1"

  build_config {
    runtime     = "python311"
    entry_point = "rotate_secret"
    source {
      storage_source {
        bucket = google_storage_bucket.functions.name
        object = google_storage_bucket_object.rotator_code.name
      }
    }
  }

  service_config {
    max_instance_count = 1
    available_memory   = "256M"
    timeout_seconds    = 60

    service_account_email = google_service_account.rotator.email
  }

  event_trigger {
    event_type   = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic = google_pubsub_topic.secret_rotation.id
  }
}
```

## Audit Logging

Secret Manager access is automatically logged in Cloud Audit Logs. Enable Data Access logs for detailed tracking:

```hcl
resource "google_project_iam_audit_config" "secretmanager" {
  project = var.project_id
  service = "secretmanager.googleapis.com"

  audit_log_config {
    log_type = "DATA_READ"
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }
}
```

Query access logs:

```bash
# View recent secret access events
gcloud logging read '
  resource.type="secretmanager.googleapis.com/Secret"
  AND protoPayload.methodName="google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion"
' --limit=20
```

## Monitoring Your Infrastructure

Secret Manager handles your sensitive data, but you need to monitor the services that consume those secrets. [OneUptime](https://oneuptime.com) provides uptime monitoring, alerting, and incident management for your GCP infrastructure, ensuring your applications stay healthy.

## Conclusion

GCP Secret Manager provides a straightforward way to manage secrets in Terraform. Create secrets, control access with IAM, integrate with Cloud Run and GKE natively, and set up rotation for passwords that need to change regularly. The deep integration with GCP services means your applications can access secrets without Terraform ever needing to expose the values in its configuration.

For secret management on other clouds, see our guides on [AWS Secrets Manager](https://oneuptime.com/blog/post/2026-02-23-how-to-use-aws-secrets-manager-with-terraform/view) and [Azure Key Vault](https://oneuptime.com/blog/post/2026-02-23-how-to-use-azure-key-vault-secrets-in-terraform/view).
